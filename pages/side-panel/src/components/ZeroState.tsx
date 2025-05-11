import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Flex,
  HStack,
  Text,
  VStack,
  Textarea,
  Tooltip,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  ButtonGroup,
  IconButton,
} from '@chakra-ui/react';
import { isRestrictedGoogleDomain } from '../utils/domainUtils';
import { ChevronDownIcon } from '@chakra-ui/icons';

type Props = {
  pageType: {
    type: string;
    url?: string;
  };
  isCapturing: boolean;
  onSummarize: (options?: { reloadPage?: boolean; selection?: boolean; manualContent?: string }) => void;
};

type ZeroStateMessage = {
  type: 'THREAD_PANE_AVAILABLE' | 'THREAD_PANE_CLOSED' | 'READABILITY_RESULT' | 'RELOAD_AND_CAPTURE';
  isReadable?: boolean;
};

export const ZeroState = ({ pageType, isCapturing, onSummarize }: Props) => {
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

  // Move state from SidePanel into this component
  const [isThreadPaneAvailable, setIsThreadPaneAvailable] = useState(false);
  const [isUnsupportedPage, setIsUnsupportedPage] = useState(false);
  const [isContentScriptLoaded, setIsContentScriptLoaded] = useState(true);
  const [isRestrictedDomain, setIsRestrictedDomain] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [readabilityChecked, setReadabilityChecked] = useState(false);
  const [isReadable, setIsReadable] = useState(true);
  const [domReady, setDomReady] = useState(true);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [manualContent, setManualContent] = useState('');

  // Handle unsupported page detection
  useEffect(() => {
    const checkIfUnsupportedPage = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (!currentTab?.url) return;

        const isOptions = currentTab.url.startsWith(chrome.runtime.getURL('/options/'));
        const isChromeUrl = currentTab.url.startsWith('chrome://');
        const isViewSourceUrl = currentTab.url.startsWith('view-source:');
        const isRestricted = isRestrictedGoogleDomain(currentTab.url);

        setIsUnsupportedPage(isOptions || isChromeUrl || isRestricted || isViewSourceUrl);
        setIsRestrictedDomain(isRestricted);
      });
    };

    checkIfUnsupportedPage();
    chrome.tabs.onActivated.addListener(checkIfUnsupportedPage);
    chrome.tabs.onUpdated.addListener((_, changeInfo) => {
      if (changeInfo.url) {
        checkIfUnsupportedPage();
      }
    });

    return () => {
      chrome.tabs.onActivated.removeListener(checkIfUnsupportedPage);
      chrome.tabs.onUpdated.removeListener(checkIfUnsupportedPage);
    };
  }, []);

  // Check content script
  const checkContentScript = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (!currentTab?.id) return;

      const tabId = currentTab.id;

      // Skip check if we're on a restricted domain
      if (isRestrictedDomain) {
        setIsContentScriptLoaded(false);
        return;
      }

      // First try to ping the content script
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
        // If we get a response or an error that's not connection-related, consider script loaded
        const lastError = chrome.runtime.lastError;
        if (
          response ||
          (lastError &&
            typeof lastError === 'object' &&
            'message' in lastError &&
            typeof lastError.message === 'string' &&
            !lastError.message.includes('connect'))
        ) {
          setIsContentScriptLoaded(true);
          // If we have a content script, immediately check readability
          if (pageType.type === 'default' || pageType.type === 'youtube') {
            chrome.tabs.sendMessage(tabId, { type: 'CHECK_READABILITY' });
          }
          return;
        }

        // If we're here, the content script might not be loaded
        setIsContentScriptLoaded(false);

        // Try to inject it if we're not on an unsupported page
        if (!isUnsupportedPage && !isPageLoading) {
          try {
            chrome.scripting
              .executeScript({
                target: { tabId },
                files: ['content/index.iife.js'],
              })
              .then(() => {
                setIsContentScriptLoaded(true);

                // After injecting, check readability for article pages
                if (pageType.type === 'default' || pageType.type === 'youtube') {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: 'CHECK_READABILITY' });
                  }, 200);
                }
              })
              .catch(err => {
                console.error('Failed to inject content script:', err);
                setIsContentScriptLoaded(false);
              });
          } catch (err) {
            console.error('Error injecting content script:', err);
            setIsContentScriptLoaded(false);
          }
        }
      });
    });
  }, [isUnsupportedPage, isPageLoading, pageType.type, isRestrictedDomain]);

  // Handle tab updates
  useEffect(() => {
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'loading') {
        setIsPageLoading(true);
        setDomReady(false);
        setReadabilityChecked(false); // Reset readability check on page load
      } else if (changeInfo.status === 'complete') {
        setIsPageLoading(false);
        setDomReady(true);
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.id === tabId) {
            // Give a little time for the page to fully load before checking
            setTimeout(() => {
              checkContentScript();
            }, 200);
          }
        });
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    // Initial check when component mounts
    const initialCheck = setTimeout(() => {
      setIsContentScriptLoaded(true);
      checkContentScript();
    }, 300);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      clearTimeout(initialCheck);
    };
  }, [checkContentScript]);

  // Handle tab activation
  useEffect(() => {
    const handleTabActivated = () => {
      setDomReady(true);
      setReadabilityChecked(false);
      setIsReadable(true);

      setTimeout(() => {
        checkContentScript();
      }, 100);
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [checkContentScript]);

  // Check thread availability for Slack
  useEffect(() => {
    if (pageType.type === 'slack') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
          chrome.tabs.sendMessage(currentTab.id, { type: 'CHECK_THREAD_PANE' });
        }
      });
    }
  }, [pageType.type]);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: ZeroStateMessage) => {
      if (message.type === 'THREAD_PANE_AVAILABLE') {
        setIsThreadPaneAvailable(true);
      } else if (message.type === 'THREAD_PANE_CLOSED') {
        setIsThreadPaneAvailable(false);
      } else if (message.type === 'READABILITY_RESULT' && message.isReadable !== undefined) {
        setIsReadable(message.isReadable);
        setReadabilityChecked(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Check readability for pages
  useEffect(() => {
    if (
      (pageType.type === 'default' || pageType.type === 'youtube') &&
      !isUnsupportedPage &&
      isContentScriptLoaded &&
      domReady
    ) {
      const timeoutId = setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.id) {
            chrome.tabs.sendMessage(currentTab.id, { type: 'CHECK_READABILITY' });
          }
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [pageType.type, isUnsupportedPage, isContentScriptLoaded, domReady]);

  // Listen for selection changes from content script
  useEffect(() => {
    const handleMessage = (message: { type: string; hasSelection?: boolean; selectedText?: string }) => {
      if (message.type === 'SELECTION_CHANGED') {
        setHasSelection(message.hasSelection || false);
        setSelectedText(message.selectedText || '');
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleSummarizeSelection = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (!currentTab?.id) return;

      chrome.tabs.sendMessage(currentTab.id, { type: 'CAPTURE_SELECTION' }, response => {
        if (response?.type === 'SELECTION_CAPTURED') {
          onSummarize({ selection: true });
        }
      });
    });
  }, [onSummarize]);

  const handleReloadPage = useCallback(() => {
    onSummarize({ reloadPage: true });
    chrome.runtime.sendMessage({ type: 'RELOAD_AND_CAPTURE' });
  }, [onSummarize]);

  return (
    <Flex height="100%" direction="column" justify="flex-start" align="center" p={4} gap={3}>
      {pageType.type === 'slack' ? (
        <VStack spacing={4} width="100%" align="center">
          <Button
            isDisabled={!isThreadPaneAvailable || (!isContentScriptLoaded && !isUnsupportedPage)}
            colorScheme="blue"
            leftIcon={<Text>⭐️</Text>}
            onClick={() => onSummarize()}
            isLoading={isCapturing}
            loadingText="Capturing thread">
            Summarize current page
          </Button>
          {!isUnsupportedPage && isContentScriptLoaded && (
            <HStack spacing={1}>
              <Text fontSize="xs" color={textColorSecondary}>
                Click
              </Text>
              <Flex h="24px" align="center" gap={2} bg={buttonBg} px={3} borderRadius="md" boxShadow="lg">
                <Text fontSize="xs">⭐️</Text>
                <Text fontSize="xs" color={textColor}>
                  Summarize
                </Text>
              </Flex>
              <Text fontSize="xs" color={textColorSecondary}>
                in any conversation
              </Text>
            </HStack>
          )}
        </VStack>
      ) : (
        <VStack spacing={3} width="100%" align="stretch">
          <Tooltip
            label={readabilityChecked && !isReadable ? "This page doesn't contain readable content" : ''}
            isDisabled={!readabilityChecked || isReadable}
            hasArrow
            placement="top"
            fontSize="xs">
            <ButtonGroup isAttached width="100%">
              <Button
                colorScheme="pink"
                leftIcon={<Text>⭐️</Text>}
                isLoading={isCapturing}
                loadingText="Capturing page"
                isDisabled={
                  isUnsupportedPage || (readabilityChecked && !isReadable) || (!isContentScriptLoaded && domReady)
                }
                onClick={() => onSummarize()}
                flexGrow={1}>
                Summarize current page
              </Button>
              <Menu placement="bottom-end">
                <MenuButton as={IconButton} aria-label="more-options" icon={<ChevronDownIcon />} colorScheme="pink" />
                <MenuList>
                  <MenuItem
                    onClick={handleSummarizeSelection}
                    isDisabled={!hasSelection}
                    width="100%"
                    title={selectedText}>
                    Summarize selected text
                  </MenuItem>
                </MenuList>
              </Menu>
            </ButtonGroup>
          </Tooltip>
          {readabilityChecked && !isReadable && (
            <Text fontSize="xs" color="orange.500" textAlign="center">
              Warning: This page may not contain readable content. The summary might be limited.
            </Text>
          )}
          {pageType.url && !isUnsupportedPage && (
            <Text
              maxW="300px"
              fontSize="xs"
              color={textColorSecondary}
              textAlign="center"
              title={pageType.url}
              isTruncated>
              {pageType.url}
            </Text>
          )}
          <Text fontSize="xs" color={textColorSecondary} textAlign="center">
            Or paste your own content to summarize
          </Text>
          <Textarea
            placeholder="Paste content here"
            value={manualContent}
            onChange={e => setManualContent(e.target.value)}
            size="sm"
            rows={5}
            resize="vertical"
            w="100%"
          />
          <Button
            colorScheme="green"
            onClick={() => onSummarize({ manualContent })}
            isDisabled={!manualContent.trim()}
            isLoading={isCapturing}
            loadingText="Summarizing"
            w="100%">
            Summarize custom content
          </Button>
        </VStack>
      )}
      {!isContentScriptLoaded && !isCapturing && !isUnsupportedPage && !isPageLoading && !isRestrictedDomain && (
        <Text fontSize="xs" color={textColorSecondary} textAlign="center">
          Please{' '}
          <Button onClick={handleReloadPage} size="xs">
            reload
          </Button>{' '}
          the page to enable summarization
        </Text>
      )}
    </Flex>
  );
};

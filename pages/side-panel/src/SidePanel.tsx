import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense, useStorage, useHats } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM, convertToWebUrl, formatRelativeTime, findBestMatchingHat } from './utils';
import { formatArticleContent } from './utils/formatContent';
import { isRestrictedGoogleDomain } from './utils/domainUtils';
import type { ThreadData, ThreadDataMessage, ArticleDataResultMessage, ArticleData, Message } from './types';
import { useForm } from 'react-hook-form';
import { Box, Flex, useColorModeValue, useColorMode, Alert, AlertIcon } from '@chakra-ui/react';
import { Messages } from './Messages';
import { MessageHeader } from './components/MessageHeader';
import { Nav } from './components/Nav';
import { usePageType } from './lib/use-page-type';
import { SUPPORTED_LANGUAGES, selectedHatStorage, modeStorage, languageStorage } from '../../options/src/vars';
import { OriginalContent } from './components/OriginalContent';
import { QuestionInput } from './components/QuestionInput';
import { ZeroState } from './components/ZeroState';

type FormData = {
  question: string;
};

const handleOpenOptions = () => {
  // First check if options page is already open
  chrome.tabs.query({ url: chrome.runtime.getURL('/options/index.html*') }, tabs => {
    if (tabs.length > 0) {
      // If found, activate the existing tab
      chrome.tabs.update(tabs[0].id!, { active: true });
    } else {
      // If not found, open a new options page
      chrome.runtime.openOptionsPage();
    }
  });
};

const handleOpenOptionsWithRoute = (route: string) => {
  // Add via=side-panel to the URL
  const optionsUrl = `/options/index.html#${route}?via=side-panel`;

  // Check for existing options page
  chrome.tabs.query({ url: chrome.runtime.getURL('/options/index.html*') }, tabs => {
    if (tabs.length > 0) {
      // If found, update the existing tab with new route and activate it
      chrome.tabs.update(tabs[0].id!, {
        url: optionsUrl,
        active: true,
      });
    } else {
      // If not found, create new tab
      chrome.tabs.create({ url: optionsUrl });
    }
  });
};

const SidePanel = () => {
  const hats = useHats();
  const selectedHat = useStorage(selectedHatStorage);
  const mode = useStorage(modeStorage);
  const selectedLanguage = useStorage(languageStorage);

  const latestLanguageRef = useRef(selectedLanguage);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnOriginalPage, setIsOnOriginalPage] = useState(true);
  const [originalContent, setOriginalContent] = useState<string>('');
  const isInitialLoad = useRef(true);
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const {
    register,
    handleSubmit: handleFormSubmit,
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      question: '',
    },
  });
  const [isTyping, setIsTyping] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [formattedUrl, setFormattedUrl] = useState<string>('');
  const pageType = usePageType();
  const [hasContent, setHasContent] = useState(false);
  const [articleContent, setArticleContent] = useState<string | ArticleData>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [contentType, setContentType] = useState<'slack' | 'article' | null>(null);
  const [showOriginalContent, setShowOriginalContent] = useState(false);
  const [isThreadPaneAvailable, setIsThreadPaneAvailable] = useState(false);

  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');

  const [isOptionsPage, setIsOptionsPage] = useState(false);
  const [isContentScriptLoaded, setIsContentScriptLoaded] = useState(true);
  const [isReadable, setIsReadable] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [readabilityChecked, setReadabilityChecked] = useState(false);
  const [domReady, setDomReady] = useState(true);
  const [isRestrictedDomain, setIsRestrictedDomain] = useState(false);

  const handleAskAssistant = useCallback(
    async (prompt: string, isInitialAnalysis = false) => {
      setIsTyping(true);
      setIsGenerating(true);

      const selectedHatData = hats.find(hat => hat.id === selectedHat);
      if (!selectedHatData) return;

      try {
        // Use latestLanguage instead of selectedLanguage
        const effectiveLanguage =
          mode === 'simple' ? latestLanguageRef.current : selectedHatData.language || latestLanguageRef.current;

        const selectedLanguageData = SUPPORTED_LANGUAGES.find(lang => lang.code === effectiveLanguage);
        if (!selectedLanguageData) return;

        const systemPrompt = `---
output_language:
  name: "${selectedLanguageData.name}"
  code: "${selectedLanguageData.code}"
current_time: "${new Date().toISOString()}"
---

${selectedHatData.prompt}`;

        // Clear previous messages if language changed in simple mode
        if (mode === 'simple' && isInitialAnalysis) {
          setMessages([]);
        }

        const previousMessages = messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : '',
        }));

        const messagesWithContext = isInitialAnalysis
          ? []
          : [{ role: 'user' as const, content: originalContent }, ...previousMessages];

        await askAssistant({
          systemPrompt,
          userPrompt: prompt,
          previousMessages: messagesWithContext,
          ...(selectedHatData.model && { model: selectedHatData.model }),
          ...(selectedHatData.temperature && { temperature: selectedHatData.temperature }),
          options: {
            onAbort: () => {
              setIsTyping(false);
              setIsGenerating(false);
            },
            onError: () => {
              setMessages(prev => [
                ...prev,
                {
                  role: 'assistant',
                  content: (
                    <Alert status="error" variant="left-accent">
                      <AlertIcon />
                      Failed to generate response. Please try again.
                    </Alert>
                  ),
                  timestamp: Date.now(),
                },
              ]);
              setIsTyping(false);
              setIsGenerating(false);
            },
            onUpdate: response => {
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = response;
                } else {
                  newMessages.push({ role: 'assistant', content: response, timestamp: Date.now() });
                }
                return newMessages;
              });
            },
            onComplete: () => {
              setIsTyping(false);
              setIsGenerating(false);
            },
          },
        });
      } catch (error) {
        console.error('Error asking assistant:', error);
        setIsTyping(false);
        setIsGenerating(false);
      }
    },
    [hats, selectedHat, mode, messages, originalContent],
  );

  const handleHatChange = useCallback(
    (hatId: string) => {
      setIsManuallySelected(true);
      selectedHatStorage.set(hatId);

      // Trigger regeneration if there is existing content
      if (hasContent) {
        setIsGenerating(true);

        const selectedHatData = hats.find(hat => hat.id === hatId);
        if (!selectedHatData) {
          setIsGenerating(false);
          return;
        }

        // Clear previous messages before regenerating
        setMessages([]);

        if (threadData) {
          const formattedData = formatThreadForLLM(threadData);
          handleAskAssistant(formattedData, true);
        } else if (articleContent) {
          const formattedContent = formatArticleContent(articleContent, pageType, articleTitle);

          setOriginalContent(formattedContent);
          handleAskAssistant(formattedContent, true);
        }
      }
    },
    [articleContent, articleTitle, hasContent, hats, pageType.type, threadData, handleAskAssistant],
  );

  const handleClose = useCallback(() => {
    setHasContent(false);
    setThreadData(null);
    setMessages([]);
    setOriginalUrl('');
    setFormattedUrl('');
    setArticleContent('');
    setArticleTitle('');
    setContentType(null);
    setIsOnOriginalPage(true);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (hasContent) {
      setIsGenerating(true);
      try {
        if (threadData) {
          const formattedData = formatThreadForLLM(threadData);
          await handleAskAssistant(formattedData, true);
        } else if (articleContent) {
          const formattedContent = formatArticleContent(articleContent, pageType, articleTitle);

          await handleAskAssistant(formattedContent, true);
        }
      } catch (error) {
        console.error('Error regenerating:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  }, [hasContent, threadData, articleContent, handleAskAssistant, pageType.type, articleTitle]);

  useEffect(() => {
    const handleMessage = async (
      message:
        | ThreadDataMessage
        | ArticleDataResultMessage
        | {
            type: 'RELOAD_AND_CAPTURE' | 'THREAD_PANE_AVAILABLE' | 'THREAD_PANE_CLOSED' | 'READABILITY_RESULT';
            isReadable?: boolean;
          },
    ) => {
      if (message.type === 'THREAD_PANE_AVAILABLE') {
        setIsThreadPaneAvailable(true);
      } else if (message.type === 'THREAD_PANE_CLOSED') {
        setIsThreadPaneAvailable(false);
      } else if (message.type === 'READABILITY_RESULT' && message.isReadable !== undefined) {
        setIsReadable(message.isReadable);
        setReadabilityChecked(true);
      } else if (message.type === 'THREAD_DATA_RESULT') {
        setIsCapturing(false);
        setThreadData(null);
        setMessages([]);
        setHasContent(true);
        const url = message.url || '';
        setOriginalUrl(url);
        setFormattedUrl(convertToWebUrl(url));
        setContentType('slack');

        setTimeout(() => {
          setThreadData(message.payload);
          const formattedData = formatThreadForLLM(message.payload);
          setOriginalContent(formattedData);
          handleAskAssistant(formattedData, true);
        }, 100);
      } else if (message.type === 'ARTICLE_DATA_RESULT') {
        setIsCapturing(false);
        setThreadData(null);
        setMessages([]);
        setHasContent(true);
        if (message.data.url) {
          setOriginalUrl(message.data.url);
          setFormattedUrl(message.data.url);
        }
        if (message.data.title) {
          setArticleTitle(message.data.title);
        }
        setContentType('article');
        setArticleContent(message.data);

        const formattedContent = formatArticleContent(message.data, pageType, message.data.title || '');

        setOriginalContent(formattedContent);
        handleAskAssistant(formattedContent, true);
      } else if (message.type === 'RELOAD_AND_CAPTURE') {
        setIsCapturing(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant, pageType.type, selectedHat, hats]);

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

        // Try to inject it if we're not on the options page
        if (!isOptionsPage && !isPageLoading) {
          try {
            chrome.scripting
              .executeScript({
                // Here tabId is guaranteed to be a number since we checked currentTab?.id above
                target: { tabId },
                files: ['content-script.js'],
              })
              .then(() => {
                setIsContentScriptLoaded(true);

                // After injecting, check readability for article pages
                if (pageType.type === 'default' || pageType.type === 'youtube') {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: 'CHECK_READABILITY' });
                  }, 200); // Reduced from 500ms to make it faster
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
  }, [isOptionsPage, isPageLoading, pageType.type, isRestrictedDomain]);

  // Add a new useEffect for handling tab activation
  useEffect(() => {
    const handleTabActivated = () => {
      // Reset states when switching tabs
      setDomReady(true);
      setReadabilityChecked(false);
      setIsReadable(true);

      // Check the content script when a tab is activated
      setTimeout(() => {
        checkContentScript();
      }, 100);
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [checkContentScript]);

  // Handle tab updates
  useEffect(() => {
    // Define handler inside effect to avoid circular deps
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
      } else if (changeInfo.status && !domReady) {
        // If we get any status update and DOM isn't ready, check DOM ready
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.id === tabId) {
            try {
              chrome.tabs.executeScript(tabId, { code: 'document.readyState' }, results => {
                if (chrome.runtime.lastError) return;

                if (results && results[0] && (results[0] === 'interactive' || results[0] === 'complete')) {
                  setDomReady(true);
                  checkContentScript();
                }
              });
            } catch (e) {
              console.error('Error checking DOM ready state:', e);
            }
          }
        });
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    // Initial check when component mounts
    const initialCheck = setTimeout(() => {
      // Reset content script loaded state initially
      setIsContentScriptLoaded(true);
      checkContentScript();
    }, 300);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      clearTimeout(initialCheck);
    };
  }, [checkContentScript, domReady]);

  useEffect(() => {
    if (!selectedHat || isTyping || !isInitialLoad.current) return;

    if (threadData) {
      const formattedData = formatThreadForLLM(threadData);
      setMessages([]);
      handleAskAssistant(formattedData, true);
    } else if (articleContent) {
      const formattedContent = formatArticleContent(articleContent, pageType, articleTitle);

      setMessages([]);
      handleAskAssistant(formattedContent, true);
    }

    isInitialLoad.current = false;
  }, [selectedHat, threadData, articleContent, handleAskAssistant, isTyping, pageType.type, articleTitle]);

  const onSubmit = async (data: FormData) => {
    if (!data.question.trim() || isTyping) return;

    const newMessage: Message = {
      role: 'user',
      content: data.question,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    reset();
    await handleAskAssistant(data.question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleFormSubmit(onSubmit)();
    }
  };

  const handleCapturePage = useCallback(() => {
    setHasContent(false);
    setThreadData(null);
    setMessages([]);
    setOriginalUrl('');
    setFormattedUrl('');
    setArticleContent('');
    setArticleTitle('');
    setContentType(null);
    setOriginalContent('');
    setIsCapturing(true);

    const timeoutId = setTimeout(() => {
      setIsCapturing(false);
    }, 10000);

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          type: pageType.type === 'slack' ? 'CAPTURE_THREAD' : 'CAPTURE_ARTICLE',
        });
      }
    });

    return () => clearTimeout(timeoutId);
  }, [pageType.type]);

  useEffect(() => {
    const checkCurrentPage = () => {
      if (!hasContent) return;

      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (!currentTab?.url) return;

        const isMatchingUrl = (() => {
          if (contentType === 'slack') {
            return currentTab.url.includes('slack.com');
          }
          return currentTab.url === originalUrl;
        })();

        setIsOnOriginalPage(isMatchingUrl);
      });
    };

    checkCurrentPage();
    chrome.tabs.onActivated.addListener(checkCurrentPage);
    chrome.tabs.onUpdated.addListener((_, changeInfo) => {
      if (changeInfo.url) {
        checkCurrentPage();
      }
    });

    return () => {
      chrome.tabs.onActivated.removeListener(checkCurrentPage);
      chrome.tabs.onUpdated.removeListener(checkCurrentPage);
    };
  }, [hasContent, originalUrl, formattedUrl, contentType]);

  const handleToggleContent = () => setShowOriginalContent(prev => !prev);

  const handleSummarizeSlack = useCallback(() => {
    setIsCapturing(true);

    // Set a timeout to reset the capturing state if no data is received
    const timeoutId = setTimeout(() => {
      setIsCapturing(false);
    }, 10000);

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'CAPTURE_THREAD' });
      }
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // Check thread availability when component mounts
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

  // Add effect for URL-based hat selection
  useEffect(() => {
    if (hasContent) return; // Don't auto-change hat if content exists

    const updateHatFromUrl = async (url?: string) => {
      if (!url || !hats?.length) return;

      const bestMatch = findBestMatchingHat(url, hats);
      if (bestMatch?.id) {
        if (mode === 'advanced') {
          if (bestMatch.id !== selectedHat && !isManuallySelected) {
            setIsManuallySelected(false);
            selectedHatStorage.set(bestMatch.id);
          }
        } else {
          // In simple mode, use best match hat but override language
          const hat = { ...bestMatch, language: selectedLanguage };
          await selectedHatStorage.set(hat.id);
          if (bestMatch.id !== selectedHat) {
            selectedHatStorage.set(bestMatch.id);
          }
        }
      }
    };

    // Initial check
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (!isManuallySelected) {
        // Only update if not manually selected
        updateHatFromUrl(currentTab?.url);
      }
    });

    // Listen for tab changes
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      setIsManuallySelected(false); // Reset manual selection when switching tabs
      chrome.tabs.get(activeInfo.tabId, tab => {
        updateHatFromUrl(tab.url);
      });
    };

    // Listen for URL changes in the current tab
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url) {
        setIsManuallySelected(false); // Reset manual selection when URL changes
        updateHatFromUrl(changeInfo.url);
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [hats, selectedHat, hasContent, isManuallySelected, mode, selectedLanguage]);

  useEffect(() => {
    const checkIfOptionsPage = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (!currentTab?.url) return;

        const isOptions = currentTab.url.startsWith(chrome.runtime.getURL('/options/'));
        const isChromeUrl = currentTab.url.startsWith('chrome://');
        const isRestricted = isRestrictedGoogleDomain(currentTab.url);

        setIsOptionsPage(isOptions || isChromeUrl || isRestricted);
        setIsRestrictedDomain(isRestricted);
      });
    };

    checkIfOptionsPage();
    chrome.tabs.onActivated.addListener(checkIfOptionsPage);
    chrome.tabs.onUpdated.addListener((_, changeInfo) => {
      if (changeInfo.url) {
        checkIfOptionsPage();
      }
    });

    return () => {
      chrome.tabs.onActivated.removeListener(checkIfOptionsPage);
      chrome.tabs.onUpdated.removeListener(checkIfOptionsPage);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.selectedLanguage?.newValue) {
        latestLanguageRef.current = changes.selectedLanguage.newValue;
        if (hasContent && mode === 'simple') {
          handleRegenerate();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [hasContent, mode, handleRegenerate]);

  const handleReloadPage = useCallback(() => {
    setIsCapturing(true);
    chrome.runtime.sendMessage({ type: 'RELOAD_AND_CAPTURE' });
  }, []);

  // Update the readability check useEffect to support YouTube as well
  useEffect(() => {
    if (
      (pageType.type === 'default' || pageType.type === 'youtube') &&
      !isOptionsPage &&
      isContentScriptLoaded &&
      domReady
    ) {
      // Reduced delay for readability check since we're already waiting for DOM ready
      const timeoutId = setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.id) {
            chrome.tabs.sendMessage(currentTab.id, { type: 'CHECK_READABILITY' });
          }
        });
      }, 500); // Reduced from 1000ms to make it faster

      return () => clearTimeout(timeoutId);
    }
    return undefined; // Explicit return for the case when condition is false
  }, [pageType.type, isOptionsPage, isContentScriptLoaded, domReady]);

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Nav
        mode={mode}
        selectedHat={selectedHat}
        colorMode={colorMode}
        isGenerating={isGenerating}
        onHatChange={handleHatChange}
        onOpenOptions={handleOpenOptions}
        onOpenOptionsWithRoute={handleOpenOptionsWithRoute}
        onToggleColorMode={toggleColorMode}
        onLanguageChange={newLanguage => {
          latestLanguageRef.current = newLanguage;
          handleRegenerate();
        }}
      />

      <Box flex="1" overflowY="auto" position="relative">
        {!hasContent ? (
          <ZeroState
            pageType={pageType}
            isThreadPaneAvailable={isThreadPaneAvailable}
            isContentScriptLoaded={isContentScriptLoaded}
            isOptionsPage={isOptionsPage}
            isCapturing={isCapturing}
            isRestrictedDomain={isRestrictedDomain}
            isPageLoading={isPageLoading}
            readabilityChecked={readabilityChecked}
            isReadable={isReadable}
            domReady={domReady}
            handleSummarizeSlack={handleSummarizeSlack}
            handleCapturePage={handleCapturePage}
            handleReloadPage={handleReloadPage}
          />
        ) : (
          <Flex direction="column" height="100%" position="relative">
            <MessageHeader
              threadUrl={formattedUrl}
              articleTitle={articleTitle}
              isSlack={contentType === 'slack'}
              threadInfo={
                contentType === 'slack' && threadData
                  ? {
                      channelName: threadData.channel,
                      userName: threadData.messages[0]?.user || '',
                      timestamp: formatRelativeTime(parseFloat(threadData.messages[0]?.ts || '0') * 1000),
                    }
                  : undefined
              }
              onClose={handleClose}
              onRegenerate={handleRegenerate}
              isOnOriginalPage={isOnOriginalPage}
              hasContent={hasContent}
              onCapturePage={handleCapturePage}
              pageType={pageType}
            />
            <Box flex="1" overflowY="auto" pb="150px">
              <Messages messages={messages} isTyping={isTyping} />
            </Box>

            <Box position="absolute" bottom="0" left="0" right="0" bg={bg}>
              <QuestionInput
                register={register}
                watch={watch}
                onSubmit={onSubmit}
                handleKeyDown={handleKeyDown}
                handleFormSubmit={handleFormSubmit}
                isTyping={isTyping}
              />

              {/* Original Content Section */}
              <OriginalContent
                isOpen={showOriginalContent}
                onToggle={handleToggleContent}
                originalContent={originalContent}
                contentType={contentType}
                threadData={threadData}
              />
            </Box>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default withErrorBoundary(
  withSuspense(() => <SidePanel />, <div> Loading ... </div>),
  <div> Error Occur </div>,
);

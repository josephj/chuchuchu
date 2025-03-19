import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense, useStorage, useHats } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM, convertToWebUrl, formatRelativeTime, estimateTokens, findBestMatchingHat } from './utils';
import type { ThreadData, ThreadDataMessage, ArticleDataResultMessage, ArticleData, Message } from './types';
import { useForm } from 'react-hook-form';
import {
  Box,
  Flex,
  Text,
  Button,
  Textarea,
  useColorModeValue,
  VStack,
  IconButton,
  useColorMode,
  Collapse,
  HStack,
  Alert,
  AlertIcon,
  Tooltip,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  MoonIcon,
  SunIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SettingsIcon,
  EditIcon,
  AddIcon,
  CopyIcon,
  ArrowUpIcon,
} from '@chakra-ui/icons';
import { Messages } from './Messages';
import { Header } from './Header';
import { usePageType } from './lib/use-page-type';
import { HatSelector } from './HatSelector';
import { SUPPORTED_LANGUAGES, selectedHatStorage, modeStorage, languageStorage } from '../../options/src/vars';
import { LanguageSelector } from './LanguageSelector/LanguageSelector';

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
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

  const [isOptionsPage, setIsOptionsPage] = useState(false);
  const [isContentScriptLoaded, setIsContentScriptLoaded] = useState(false);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

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
          const formattedContent =
            typeof articleContent === 'string'
              ? articleContent
              : pageType.type === 'youtube'
                ? `---
title: ${articleTitle}
${articleContent.channel ? `channel: ${articleContent.channel}` : ''}
${articleContent.publishDate ? `published: ${articleContent.publishDate}` : ''}
type: youtube
---

${articleContent.description ? `## Description\n${articleContent.description}` : 'No description available'}

${articleContent.transcript ? `## Transcript\n${articleContent.transcript}` : ''}`
                : `---
title: ${articleTitle}
${articleContent.siteName ? `source: ${articleContent.siteName}` : ''}
${articleContent.byline ? `author: ${articleContent.byline}` : ''}
type: article
---

${articleContent.excerpt ? `Summary: \n${articleContent.excerpt}\n` : ''}

${articleContent.content || ''}`.trim();

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
          const formattedContent =
            typeof articleContent === 'string'
              ? articleContent
              : pageType.type === 'youtube'
                ? `---
title: ${articleTitle}
${articleContent.channel ? `channel: ${articleContent.channel}` : ''}
${articleContent.publishDate ? `published: ${articleContent.publishDate}` : ''}
type: youtube
---

${articleContent.description ? `## Description\n${articleContent.description}` : 'No description available'}

${articleContent.transcript ? `## Transcript\n${articleContent.transcript}` : ''}`
                : `---
title: ${articleTitle}
${articleContent.siteName ? `source: ${articleContent.siteName}` : ''}
${articleContent.byline ? `author: ${articleContent.byline}` : ''}
type: article
---

${articleContent.excerpt ? `Summary: \n${articleContent.excerpt}\n` : ''}

${articleContent.content || ''}`.trim();

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
        | { type: 'RELOAD_AND_CAPTURE' | 'THREAD_PANE_AVAILABLE' | 'THREAD_PANE_CLOSED' },
    ) => {
      if (message.type === 'THREAD_PANE_AVAILABLE') {
        setIsThreadPaneAvailable(true);
      } else if (message.type === 'THREAD_PANE_CLOSED') {
        setIsThreadPaneAvailable(false);
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

        const formattedContent =
          pageType.type === 'youtube'
            ? `---
title: ${message.data.title || ''}
${message.data.channel ? `channel: ${message.data.channel}` : ''}
${message.data.publishDate ? `published: ${message.data.publishDate}` : ''}
type: youtube
---

${message.data.description ? `## Description\n${message.data.description}` : 'No description available'}

${message.data.transcript ? `## Transcript\n${message.data.transcript}` : ''}`
            : `---
title: ${message.data.title || ''}
${message.data.siteName ? `source: ${message.data.siteName}` : ''}
${message.data.byline ? `author: ${message.data.byline}` : ''}
type: article
---

${message.data.excerpt ? `Summary: \n${message.data.excerpt}\n` : ''}

${message.data.content || ''}`.trim();

        setOriginalContent(formattedContent);
        handleAskAssistant(formattedContent, true);
      } else if (message.type === 'RELOAD_AND_CAPTURE') {
        setIsCapturing(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant, pageType.type, selectedHat, hats]);

  useEffect(() => {
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'complete') {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.id === tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'PING' }, () => {
              const isLoaded = chrome.runtime.lastError ? false : true;
              setIsContentScriptLoaded(isLoaded);
              if (isLoaded) {
                setIsCapturing(false);
              }
            });
          }
        });
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  }, []);

  useEffect(() => {
    if (!selectedHat || isTyping || !isInitialLoad.current) return;

    if (threadData) {
      const formattedData = formatThreadForLLM(threadData);
      setMessages([]);
      handleAskAssistant(formattedData, true);
    } else if (articleContent) {
      const formattedContent =
        pageType.type === 'youtube' && typeof articleContent !== 'string'
          ? `---
title: ${articleTitle}
${articleContent.channel ? `channel: ${articleContent.channel}` : ''}
${articleContent.publishDate ? `published: ${articleContent.publishDate}` : ''}
type: youtube
---

${articleContent.description ? `## Description\n${articleContent.description}` : 'No description available'}

${articleContent.transcript ? `## Transcript\n${articleContent.transcript}` : ''}`
          : typeof articleContent === 'string'
            ? articleContent
            : `---
title: ${articleTitle}
${articleContent.siteName ? `source: ${articleContent.siteName}` : ''}
${articleContent.byline ? `author: ${articleContent.byline}` : ''}
type: article
---

${articleContent.excerpt ? `Summary: \n${articleContent.excerpt}\n` : ''}

${articleContent.content || ''}`.trim();

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
        setIsOptionsPage(isOptions);
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

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(originalContent).then(
      () => {
        // Optional: You could add a toast notification here
      },
      err => {
        console.error('Failed to copy text:', err);
      },
    );
  }, [originalContent]);

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

  const checkContentScript = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (!currentTab?.id) return;

      chrome.tabs.sendMessage(currentTab.id, { type: 'PING' }, () => {
        const isLoaded = chrome.runtime.lastError ? false : true;
        setIsContentScriptLoaded(isLoaded);
        setShowReloadPrompt(!isLoaded);
      });
    });
  }, []);

  useEffect(() => {
    checkContentScript();
  }, [checkContentScript]);

  const handleReloadPage = useCallback(() => {
    setIsCapturing(true);
    chrome.runtime.sendMessage({ type: 'RELOAD_AND_CAPTURE' });
    setShowReloadPrompt(false);
  }, []);

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Flex justify="space-between" align="center">
          <Box px="1">
            {mode === 'simple' ? (
              <HStack>
                <Text fontSize="xl">🌐</Text>
                <LanguageSelector
                  onChange={newLanguage => {
                    latestLanguageRef.current = newLanguage;
                    handleRegenerate();
                  }}
                  isDisabled={isGenerating}
                />
              </HStack>
            ) : (
              <ButtonGroup size="sm" variant="ghost" spacing={0} bg={buttonBg} borderRadius="md" p={1}>
                <Box px={1}>
                  <HatSelector value={selectedHat} onChange={handleHatChange} isDisabled={isGenerating} />
                </Box>
                <Tooltip label="Edit current hat" placement="top" fontSize="xs">
                  <IconButton
                    aria-label="Edit current hat"
                    icon={<EditIcon />}
                    onClick={() => handleOpenOptionsWithRoute(`/hats/edit/${selectedHat}`)}
                    size="sm"
                    variant="ghost"
                    color={textColor}
                  />
                </Tooltip>
                <Tooltip label="Create new hat" placement="top" fontSize="xs">
                  <IconButton
                    aria-label="Create new hat"
                    icon={<AddIcon />}
                    onClick={() => handleOpenOptionsWithRoute('/hats/add')}
                    size="sm"
                    variant="ghost"
                    color={textColor}
                  />
                </Tooltip>
              </ButtonGroup>
            )}
          </Box>

          <Flex gap={2}>
            <IconButton
              aria-label="Open settings"
              icon={<SettingsIcon />}
              onClick={handleOpenOptions}
              size="sm"
              variant="ghost"
              color={textColor}
            />
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              size="sm"
              variant="ghost"
              color={textColor}
            />
          </Flex>
        </Flex>
      </Box>

      {/* Main Content Section */}
      <Box flex="1" overflowY="auto" position="relative">
        {!hasContent ? (
          <Flex height="100%" direction="column" justify="center" align="center" p={4} gap={3}>
            {pageType.type === 'slack' ? (
              <VStack spacing={4} width="100%" align="center">
                <Button
                  isDisabled={!isThreadPaneAvailable || !isContentScriptLoaded}
                  colorScheme="blue"
                  leftIcon={<Text>⭐️</Text>}
                  onClick={handleSummarizeSlack}
                  isLoading={isCapturing}
                  loadingText="Capturing thread">
                  Summarize current page
                </Button>
                {!isOptionsPage && isContentScriptLoaded && (
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
              <VStack spacing={3}>
                <Button
                  onClick={handleCapturePage}
                  colorScheme="blue"
                  leftIcon={<Text>⭐️</Text>}
                  isLoading={isCapturing}
                  loadingText="Capturing page"
                  isDisabled={isOptionsPage || !isContentScriptLoaded}>
                  Summarize current page
                </Button>
                {pageType.url && !isOptionsPage && isContentScriptLoaded && (
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
              </VStack>
            )}
            {!isContentScriptLoaded && !isCapturing && (
              <Text fontSize="xs" color={textColorSecondary} textAlign="center">
                Please{' '}
                <Button onClick={handleReloadPage} size="xs">
                  reload
                </Button>{' '}
                the page to enable summarization
              </Text>
            )}
          </Flex>
        ) : (
          <VStack spacing={4} align="stretch">
            <Header
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
            <Messages messages={messages} isTyping={isTyping} />
          </VStack>
        )}
      </Box>

      {/* Input Section */}
      {hasContent && (
        <>
          <Box p={4} borderTop="1px" borderColor={borderColor} fontSize="13px">
            <form onSubmit={handleFormSubmit(onSubmit)}>
              <Box position="relative">
                <Textarea
                  {...register('question')}
                  onKeyDown={handleKeyDown}
                  isDisabled={isTyping}
                  rows={3}
                  fontSize="13px"
                  placeholder="Ask a follow-up question... (Cmd/Ctrl + Enter to submit)"
                  resize="none"
                  color={textColor}
                  variant="outline"
                  _placeholder={{ color: textColorSecondary }}
                  pr="40px"
                  sx={{
                    '&:focus-visible': {
                      '& + div': {
                        zIndex: 2,
                      },
                    },
                  }}
                />
                <Box position="absolute" right="8px" top="8px" zIndex={1}>
                  <Tooltip label="Send (Cmd/Ctrl + Enter)" placement="top" fontSize="xs">
                    <IconButton
                      type="submit"
                      isDisabled={isTyping || !watch('question').trim()}
                      colorScheme="blue"
                      aria-label="Send message"
                      icon={<ArrowUpIcon />}
                      size="sm"
                    />
                  </Tooltip>
                </Box>
              </Box>
            </form>
          </Box>

          {/* Original Content Section */}
          <Box borderTop="1px" borderColor={borderColor}>
            <Button
              width="100%"
              variant="ghost"
              fontSize="xs"
              onClick={handleToggleContent}
              rightIcon={showOriginalContent ? <ChevronDownIcon /> : <ChevronUpIcon />}
              size="sm"
              color={textColorSecondary}>
              Original content ({estimateTokens(originalContent)} tokens)
            </Button>
            <Collapse in={showOriginalContent}>
              <Box position="relative">
                <Box p={4} maxH="300px" overflowY="auto" overflowX="hidden" fontSize="sm" whiteSpace="pre-wrap">
                  {contentType === 'slack' && threadData ? (
                    <VStack align="stretch" spacing={4}>
                      {threadData.messages.map((msg, index) => (
                        <Box key={index}>
                          <Text fontWeight="bold">{msg.user}</Text>
                          <Text>{msg.text}</Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text>{originalContent}</Text>
                  )}
                  <Tooltip hasArrow label="Copy content" placement="left" fontSize="xs">
                    <IconButton
                      aria-label="Copy content"
                      icon={<CopyIcon />}
                      onClick={handleCopyContent}
                      size="sm"
                      variant="ghost"
                      position="absolute"
                      bottom={5}
                      right={5}
                      bg="whiteAlpha.800"
                      _dark={{ bg: 'blackAlpha.800' }}
                      _hover={{
                        bg: 'whiteAlpha.900',
                        _dark: { bg: 'blackAlpha.900' },
                      }}
                    />
                  </Tooltip>
                </Box>
              </Box>
            </Collapse>
          </Box>
        </>
      )}
    </Flex>
  );
};

export default withErrorBoundary(
  withSuspense(() => <SidePanel />, <div> Loading ... </div>),
  <div> Error Occur </div>,
);

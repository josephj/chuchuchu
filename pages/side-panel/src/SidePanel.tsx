import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense, useStorage, useHats } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM, convertToWebUrl, formatRelativeTime, findBestMatchingHat } from './utils';
import { formatArticleContent } from './utils/formatContent';
import type { ThreadData, ThreadDataMessage, ArticleDataResultMessage, ArticleData, Message } from './types';
import { useForm } from 'react-hook-form';
import { Box, Flex, useColorModeValue, useColorMode, Alert, AlertIcon, useToast } from '@chakra-ui/react';
import { Messages } from './Messages';
import { MessageHeader } from './components/MessageHeader';
import { Nav } from './components/Nav';
import { usePageType } from './lib/use-page-type';
import { SUPPORTED_LANGUAGES, selectedHatStorage, modeStorage, languageStorage } from '../../options/src/vars';
import { OriginalContent } from './components/OriginalContent';
import { QuestionInput } from './components/QuestionInput';
import { ZeroState } from './components/ZeroState';
import { runModelMigration } from '../../options/src/utils/model-migration';

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
  const toast = useToast();
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

  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');

  const handleAskAssistant = useCallback(
    async (prompt: string, isInitialAnalysis = false, overrideHatId?: string) => {
      setIsTyping(true);
      setIsGenerating(true);

      const effectiveHatId = overrideHatId || selectedHat;
      const selectedHatData = hats.find(hat => hat.id === effectiveHatId);
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
    [hats, selectedHat, mode, messages, originalContent, latestLanguageRef],
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
          handleAskAssistant(formattedData, true, hatId);
        } else if (articleContent) {
          const formattedContent = formatArticleContent(articleContent, pageType, articleTitle);

          setOriginalContent(formattedContent);
          handleAskAssistant(formattedContent, true, hatId);
        }
      }
    },
    [hasContent, hats, threadData, articleContent, handleAskAssistant, pageType, articleTitle],
  );

  const handleClose = useCallback(() => {
    setIsCapturing(false);
    setArticleContent('');
    setArticleTitle('');
    setContentType(null);
    setFormattedUrl('');
    setHasContent(false);
    setIsOnOriginalPage(true);
    setMessages([]);
    setOriginalUrl('');
    setThreadData(null);
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
  }, [hasContent, threadData, articleContent, handleAskAssistant, pageType, articleTitle]);

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
      if (message.type === 'RELOAD_AND_CAPTURE') {
        setIsCapturing(true);
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
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant, pageType.type, selectedHat, hats]);

  // Add effect for URL-based hat selection
  useEffect(() => {
    if (hasContent) return;

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

  // Reapply initial content analysis when hat changes
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
  }, [selectedHat, threadData, articleContent, handleAskAssistant, isTyping, pageType, articleTitle]);

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

  useEffect(() => {
    const checkAndMigrateModels = async () => {
      const hasChanges = await runModelMigration();
      if (hasChanges) {
        toast({
          title: 'Model Update',
          description: 'Some AI models have been updated to newer versions to ensure continued functionality.',
          status: 'info',
          duration: 9000,
          isClosable: true,
        });
      }
    };

    checkAndMigrateModels();
  }, [toast]);

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
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

      <Box flex="1" height="0" overflowY="auto">
        {!hasContent ? (
          <ZeroState
            pageType={pageType}
            isCapturing={isCapturing}
            onSummarize={options => {
              if (options?.manualContent) {
                setIsCapturing(true);
                setHasContent(true);
                setThreadData(null);
                setMessages([]);
                setOriginalUrl('');
                setFormattedUrl('');
                setArticleContent(options.manualContent);
                setOriginalContent(options.manualContent);
                setArticleTitle('');
                setContentType('article');
                handleAskAssistant(options.manualContent, true);
                return;
              }
              setIsCapturing(true);
              if (!options?.reloadPage) {
                if (options?.selection) {
                  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    const currentTab = tabs[0];
                    if (currentTab?.id) {
                      chrome.tabs.sendMessage(currentTab.id, { type: 'CAPTURE_SELECTION' }, response => {
                        if (response?.type === 'SELECTION_CAPTURED') {
                          setArticleContent(response.content);
                          setArticleTitle(response.title || '');
                          setContentType('article');
                          setHasContent(true);
                          setOriginalUrl(response.url || '');
                          setFormattedUrl(response.url || '');
                          const formattedContent = formatArticleContent(
                            response.content,
                            pageType,
                            response.title || '',
                          );
                          setOriginalContent(formattedContent);
                          handleAskAssistant(formattedContent, true);
                        }
                        setIsCapturing(false);
                      });
                    }
                  });
                } else if (pageType.type === 'slack') {
                  handleSummarizeSlack();
                } else {
                  handleCapturePage();
                }
              }
            }}
          />
        ) : (
          <Flex direction="column" height="100%">
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
            <Box flex="1" height="0" overflowY="auto">
              <Messages messages={messages} isTyping={isTyping} />
            </Box>

            <Box bg={bg}>
              <QuestionInput
                register={register}
                watch={watch}
                onSubmit={onSubmit}
                handleKeyDown={handleKeyDown}
                handleFormSubmit={handleFormSubmit}
                isTyping={isTyping}
              />
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

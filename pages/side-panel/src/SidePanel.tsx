import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import ReactMarkdown from 'react-markdown';
import { formatThreadForLLM } from './utils';
import type { Language, ThreadData, ThreadDataMessage } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './vars';
import { useForm } from 'react-hook-form';
import {
  Tooltip,
  Box,
  Flex,
  Text,
  Button,
  Link,
  Checkbox,
  Textarea,
  useColorModeValue,
  VStack,
  IconButton,
  useColorMode,
} from '@chakra-ui/react';
import { RepeatIcon, DeleteIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import Select from 'react-select';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
};

type PageType = {
  isSlack: boolean;
  url: string;
};

type FormData = {
  question: string;
};

type ArticleData = {
  title: string;
  url: string;
  content: string;
};

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

const convertToWebUrl = (url: string): string => {
  return url.replace('/archives/', '/messages/').replace(/&cid=[^&]+/, '');
};

const formatDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Get team ID (usually the first part after /messages/)
    const teamId = pathParts[2];
    // Get the channel and thread parts
    const remainingPath = pathParts.slice(3).join('/');
    return `/${teamId.slice(0, 6)}/${remainingPath}`;
  } catch {
    return url;
  }
};

// const markdownStyles = {
//   color: useColorModeValue('gray.800', 'whiteAlpha.900'),
//   'h1, h2, h3, h4, h5, h6': {
//     color: useColorModeValue('gray.900', 'whiteAlpha.900'),
//   },
//   'p, li': {
//     color: useColorModeValue('gray.800', 'whiteAlpha.900'),
//   },
//   code: {
//     color: useColorModeValue('gray.800', 'whiteAlpha.900'),
//     bg: useColorModeValue('gray.100', 'whiteAlpha.200'),
//   },
//   a: {
//     color: linkColor,
//   },
// };

const SidePanel = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isGenerating, setIsGenerating] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language['code']>(DEFAULT_LANGUAGE_CODE);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [threadUrl, setThreadUrl] = useState<string>('');
  const [openInWeb, setOpenInWeb] = useState(true);
  const [pageType, setPageType] = useState<PageType>({ isSlack: true, url: '' });
  const [hasContent, setHasContent] = useState(false);
  const [articleContent, setArticleContent] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const messageAssistantBg = useColorModeValue('blue.50', 'blue.900');
  const messageUserBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const textColorSecondary = useColorModeValue('gray.600', 'whiteAlpha.700');
  const linkColor = useColorModeValue('blue.500', 'blue.300');
  const codeBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const blockquoteBorderColor = useColorModeValue('gray.200', 'gray.600');

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '32px',
      width: '200px',
    }),
    container: (base: any) => ({
      ...base,
      zIndex: 2,
    }),
    option: (base: any, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...base,
      cursor: 'pointer',
      padding: '8px 12px',
    }),
  };

  const selectTheme = (theme: any) => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: colorMode === 'dark' ? '#2D3748' : '#FFFFFF', // background
      neutral5: colorMode === 'dark' ? '#4A5568' : '#E2E8F0',
      neutral10: colorMode === 'dark' ? '#4A5568' : '#E2E8F0',
      neutral20: colorMode === 'dark' ? '#4A5568' : '#E2E8F0', // borders
      neutral30: colorMode === 'dark' ? '#718096' : '#A0AEC0',
      neutral40: colorMode === 'dark' ? '#A0AEC0' : '#718096',
      neutral50: colorMode === 'dark' ? '#A0AEC0' : '#718096', // placeholder text
      neutral60: colorMode === 'dark' ? '#CBD5E0' : '#4A5568',
      neutral70: colorMode === 'dark' ? '#E2E8F0' : '#2D3748',
      neutral80: colorMode === 'dark' ? '#F7FAFC' : '#1A202C', // text
      neutral90: colorMode === 'dark' ? '#FFFFFF' : '#000000',
      primary: colorMode === 'dark' ? '#90CDF4' : '#3182CE', // selected option text
      primary25: colorMode === 'dark' ? '#2A4365' : '#EBF8FF', // hovered option
      primary50: colorMode === 'dark' ? '#2C5282' : '#4299E1', // active option
      primary75: colorMode === 'dark' ? '#2A4365' : '#2B6CB0',
    },
  });

  useEffect(() => {
    chrome.storage.local.get('selectedLanguage').then(result => {
      if (result.selectedLanguage) {
        setSelectedLanguage(result.selectedLanguage);
      } else {
        setSelectedLanguage('zh-TW');
        chrome.storage.local.set({ selectedLanguage: 'zh-TW' });
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get('openInWeb').then(result => {
      if (result.openInWeb === false) {
        setOpenInWeb(false);
      } else {
        chrome.storage.local.set({ openInWeb: true });
      }
    });
  }, []);

  useEffect(() => {
    const handlePageTypeUpdate = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (currentTab?.url) {
          const isSlack = currentTab.url.includes('slack.com');
          setPageType({ isSlack, url: currentTab.url });
        }
      });
    };

    // Initial check
    handlePageTypeUpdate();

    // Listen to tab changes
    chrome.tabs.onActivated.addListener(handlePageTypeUpdate);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      // Only update if URL has changed
      if (changeInfo.url) {
        handlePageTypeUpdate();
      }
    });

    return () => {
      chrome.tabs.onActivated.removeListener(handlePageTypeUpdate);
      chrome.tabs.onUpdated.removeListener(handlePageTypeUpdate);
    };
  }, []);

  const handleAskAssistant = useCallback(
    async (prompt: string, isInitialAnalysis = false) => {
      setIsTyping(true);
      setIsGenerating(true);

      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);

      // Create two separate system prompts for different scenarios
      const initialPrompt = `You are a helpful assistant that summarises and answers questions about ${
        pageType.isSlack ? 'Slack conversations' : 'web articles'
      }. Please communicate in ${selectedLang?.name} (${selectedLanguage}).

      For the initial analysis:
      1. Provide a clear summary highlighting key points and main arguments
      2. Be concise and factual
      3. Highlight important numbers, dates, or specific names
      4. Use markdown for better readability`;

      const followUpPrompt = `You are a helpful assistant that answers questions about web articles. Please communicate in ${selectedLang?.name} (${selectedLanguage}).

      For follow-up questions:
      1. Give direct, focused answers
      2. If asked for translation, ONLY translate the content without any additional commentary or summary
      3. If asked about something not in the article, clearly state that
      4. Keep responses brief and to the point`;

      const systemPrompt = isInitialAnalysis ? initialPrompt : followUpPrompt;

      console.log('[DEBUG] System Prompt:', systemPrompt);
      console.log('[DEBUG] User Prompt:', prompt);

      const previousMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      await askAssistant(systemPrompt, prompt, isInitialAnalysis ? [] : previousMessages, {
        onAbort: () => {
          setIsTyping(false);
          setIsGenerating(false);
        },
        onError: () => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Error: Failed to generate response. Please try again.',
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
      });
    },
    [selectedLanguage, messages, pageType.isSlack],
  );

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    chrome.storage.local.set({ selectedLanguage: newLanguage });
  }, []);

  const handleOpenInWebChange = useCallback((newValue: boolean) => {
    setOpenInWeb(newValue);
    chrome.storage.local.set({ openInWeb: newValue });
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_IN_WEB_CHANGED', value: newValue });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setHasContent(false);
    setThreadData(null);
    setMessages([]);
    setThreadUrl('');
    setUserInput('');
    setArticleContent('');
  }, []);

  useEffect(() => {
    const handleMessage = (
      message: ThreadDataMessage | { type: 'CURRENT_PAGE_TYPE'; isSlack: boolean; url: string },
    ) => {
      if (message.type === 'THREAD_DATA_RESULT') {
        setThreadData(null);
        setMessages([]);
        setHasContent(true);
        setThreadUrl(message.url ? convertToWebUrl(message.url) : '');

        setTimeout(() => {
          setThreadData(message.payload);
          const formattedData = formatThreadForLLM(message.payload);
          handleAskAssistant(formattedData, true);
        }, 100);
      } else if (message.type === 'ARTICLE_DATA_RESULT' && message.data) {
        console.log('[DEBUG] ARTICLE_DATA_RESULT is executed');
        setThreadData(null);
        setMessages([]);
        setHasContent(true);
        setThreadUrl(message.data.url);
        setArticleTitle(message.data.title);

        const formattedArticle = `
Title: ${message.data.title}
${message.data.siteName ? `Source: ${message.data.siteName}` : ''}
${message.data.byline ? `Author: ${message.data.byline}` : ''}
${message.data.excerpt ? `Summary: ${message.data.excerpt}` : ''}

Content:
${message.data.content}
        `.trim();

        setArticleContent(formattedArticle);
        console.log('[DEBUG] formattedArticle', formattedArticle);
        handleAskAssistant(formattedArticle, true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant]);

  useEffect(() => {
    if (selectedLanguage) {
      if (threadData) {
        const formattedData = formatThreadForLLM(threadData);
        setMessages([]);
        handleAskAssistant(formattedData, true);
      } else if (articleContent) {
        setMessages([]);
        handleAskAssistant(articleContent, true);
      }
    }
  }, [selectedLanguage, threadData, articleContent]);

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
    console.log('[DEBUG] handleCapturePage is executed');
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'CAPTURE_ARTICLE' });
      }
    });
  }, []);

  const scrollToLatestMessage = (smooth = true) => {
    if (messagesEndRef.current?.parentElement) {
      const messages = messagesEndRef.current.parentElement.querySelectorAll('[data-message]');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const handleUserScroll = () => {
          window.removeEventListener('wheel', handleUserScroll);
          window.removeEventListener('touchmove', handleUserScroll);
          lastMessage.scrollIntoView({ behavior: 'auto', block: 'start' });
        };

        window.addEventListener('wheel', handleUserScroll, { passive: true });
        window.addEventListener('touchmove', handleUserScroll, { passive: true });

        lastMessage.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'start',
        });

        // Clean up event listeners after animation
        setTimeout(
          () => {
            window.removeEventListener('wheel', handleUserScroll);
            window.removeEventListener('touchmove', handleUserScroll);
          },
          smooth ? 300 : 0,
        );
      }
    }
  };

  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      scrollToLatestMessage();
    }
  }, [messages, isTyping]);

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Flex justify="space-between">
          <Flex gap={2} alignItems="center">
            <Tooltip label="Language" placement="top">
              <Box>
                <Text fontSize="lg">🌐</Text>
              </Box>
            </Tooltip>
            <Select<LanguageOption>
              value={SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)}
              onChange={option => handleLanguageChange(option?.code || DEFAULT_LANGUAGE_CODE)}
              options={SUPPORTED_LANGUAGES}
              isDisabled={isGenerating}
              styles={selectStyles}
              theme={selectTheme}
              placeholder="Select language..."
              isSearchable
              components={{
                IndicatorSeparator: () => null,
              }}
            />
          </Flex>

          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            size="sm"
            variant="ghost"
            color={textColor}
          />
        </Flex>

        {pageType.isSlack && (
          <Flex mt={2} gap={2} alignItems="center">
            <Text fontWeight="medium">Open links in web:</Text>
            <Checkbox
              isChecked={openInWeb}
              onChange={e => handleOpenInWebChange(e.target.checked)}
              colorScheme={colorMode === 'light' ? 'blue' : 'blue'}
            />
          </Flex>
        )}
      </Box>

      {/* Main Content Section */}
      <Box flex="1" overflowY="auto" position="relative">
        {!hasContent ? (
          <Flex height="100%" direction="column" justify="center" align="center" p={4} gap={1}>
            {pageType.isSlack ? (
              <>
                <Text fontSize="xs" color={textColorSecondary}>
                  Click
                </Text>
                <Flex
                  h="24px"
                  align="center"
                  gap={2}
                  bg={useColorModeValue('white', 'gray.700')}
                  px={2}
                  borderRadius="full"
                  boxShadow="lg">
                  <Text fontSize="xs">⭐️</Text>
                  <Text fontSize="xs" color={textColor}>
                    Summarize
                  </Text>
                </Flex>
                <Text fontSize="xs" color={textColorSecondary}>
                  in any conversation
                </Text>
              </>
            ) : (
              <VStack spacing={3}>
                <Button onClick={handleCapturePage} colorScheme="blue" leftIcon={<Text>⭐️</Text>}>
                  Summarize current page
                </Button>
                {pageType.url && (
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
          </Flex>
        ) : (
          <VStack spacing={4} align="stretch">
            {/* Sticky Header Section */}
            <Box position="sticky" top={0} zIndex={1} bg={bg} borderBottom="1px" borderColor={borderColor} pb={4}>
              {threadUrl && (
                <VStack spacing={2} align="stretch" width="100%" pt={4} px={4}>
                  {!pageType.isSlack && articleTitle && (
                    <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
                      {articleTitle}
                    </Text>
                  )}
                  <Flex align="center" gap={4} width="100%">
                    <Tooltip label={threadUrl} placement="bottom-start" openDelay={500}>
                      <Link
                        href={threadUrl}
                        isExternal
                        color={linkColor}
                        fontSize="xs"
                        isTruncated
                        _hover={{ textDecoration: 'underline' }}>
                        {pageType.isSlack ? formatDisplayUrl(threadUrl) : threadUrl}
                      </Link>
                    </Tooltip>
                    <Flex shrink={0} gap={2}>
                      <Tooltip label="Clear conversation" placement="top" openDelay={500}>
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={handleClose}
                          aria-label="Clear conversation"
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                        />
                      </Tooltip>
                      <Tooltip label="Regenerate summary" placement="top" openDelay={500}>
                        <IconButton
                          icon={<RepeatIcon />}
                          onClick={() => {
                            if (threadData) {
                              const formattedData = formatThreadForLLM(threadData);
                              handleAskAssistant(formattedData, true);
                            } else if (articleContent) {
                              handleAskAssistant(articleContent, true);
                            }
                          }}
                          aria-label="Regenerate summary"
                          colorScheme="blue"
                          variant="ghost"
                          size="sm"
                        />
                      </Tooltip>
                    </Flex>
                  </Flex>
                </VStack>
              )}
            </Box>

            {/* Messages Section */}
            <VStack spacing={4} align="stretch" px={4}>
              {messages.map((message, index) => (
                <Box
                  key={index}
                  data-message
                  bg={message.role === 'assistant' ? messageAssistantBg : messageUserBg}
                  borderRadius="lg"
                  p={4}
                  color={textColor}>
                  <Box>
                    {message.role === 'user' ? (
                      <Text>{message.content}</Text>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 'md',
                          'h1, h2, h3, h4, h5, h6': {
                            fontWeight: 'bold',
                            my: 2,
                          },
                          h1: { fontSize: '2xl' },
                          h2: { fontSize: 'xl' },
                          h3: { fontSize: 'lg' },
                          p: {
                            my: 2,
                          },
                          'ul, ol': {
                            pl: 4,
                            my: 2,
                            listStylePosition: 'inside',
                          },
                          ul: {
                            listStyleType: 'disc',
                          },
                          ol: {
                            listStyleType: 'decimal',
                          },
                          li: {
                            my: 1,
                            pl: 1,
                          },
                          code: {
                            bg: codeBg,
                            px: 1,
                            borderRadius: 'sm',
                          },
                          pre: {
                            bg: codeBg,
                            p: 2,
                            borderRadius: 'md',
                            overflowX: 'auto',
                          },
                          blockquote: {
                            borderLeftWidth: '4px',
                            borderLeftColor: blockquoteBorderColor,
                            pl: 4,
                            my: 2,
                          },
                        }}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </Box>
                    )}
                  </Box>
                  <Text fontSize="xs" color={textColorSecondary} mt={2}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text>
                </Box>
              ))}
              {isTyping && (
                <Text fontSize="sm" color={textColorSecondary} animation="pulse 2s infinite">
                  Assistant is typing...
                </Text>
              )}
              <Box ref={messagesEndRef} />
            </VStack>
          </VStack>
        )}
      </Box>

      {/* Input Section */}
      {hasContent && (
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <form onSubmit={handleFormSubmit(onSubmit)}>
            <Flex gap={2}>
              <Textarea
                {...register('question')}
                onKeyDown={handleKeyDown}
                isDisabled={isTyping}
                rows={3}
                placeholder="Ask a follow-up question... (Cmd/Ctrl + Enter to submit)"
                resize="none"
                color={textColor}
                _placeholder={{ color: textColorSecondary }}
              />
              <Button type="submit" isDisabled={isTyping || !watch('question').trim()} colorScheme="blue">
                Send
              </Button>
            </Flex>
          </form>
        </Box>
      )}
    </Flex>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);

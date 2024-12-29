import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM } from './utils';
import type { Language, ThreadData, ThreadDataMessage, ArticleDataResultMessage } from './types';
import { LanguageSelector, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './LanguageSelector';
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
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { Messages } from './Messages';
import { Header } from './Header';

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

const convertToWebUrl = (url: string): string => {
  return url.replace('/archives/', '/messages/').replace(/&cid=[^&]+/, '');
};

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
  const [pageType, setPageType] = useState<PageType>({ isSlack: true, url: '' });
  const [hasContent, setHasContent] = useState(false);
  const [articleContent, setArticleContent] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');

  const bg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const textColorSecondary = useColorModeValue('gray.600', 'whiteAlpha.700');
  const buttonBg = useColorModeValue('white', 'gray.700');

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

  const handleClose = useCallback(() => {
    setHasContent(false);
    setThreadData(null);
    setMessages([]);
    setThreadUrl('');
    setArticleContent('');
  }, []);

  const handleRegenerate = useCallback(() => {
    if (threadData) {
      const formattedData = formatThreadForLLM(threadData);
      handleAskAssistant(formattedData, true);
    } else if (articleContent) {
      handleAskAssistant(articleContent, true);
    }
  }, [threadData, articleContent, handleAskAssistant]);

  useEffect(() => {
    const handleMessage = (message: ThreadDataMessage | ArticleDataResultMessage) => {
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
      } else if (message.type === 'ARTICLE_DATA_RESULT') {
        console.log('[DEBUG] ARTICLE_DATA_RESULT is executed');
        setThreadData(null);
        setMessages([]);
        setHasContent(true);
        setThreadUrl(message.data.url);
        setArticleTitle(message.data.title || '');

        const formattedArticle = `
Title: ${message.data.title || ''}
${message.data.siteName ? `Source: ${message.data.siteName}` : ''}
${message.data.byline ? `Author: ${message.data.byline}` : ''}
${message.data.excerpt ? `Summary: ${message.data.excerpt}` : ''}

Content:
${message.data.content || ''}
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

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Flex justify="space-between">
          <LanguageSelector value={selectedLanguage} onChange={handleLanguageChange} isDisabled={isGenerating} />

          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            size="sm"
            variant="ghost"
            color={textColor}
          />
        </Flex>
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
                <Flex h="24px" align="center" gap={2} bg={buttonBg} px={2} borderRadius="full" boxShadow="lg">
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
            <Header
              threadUrl={threadUrl}
              articleTitle={articleTitle}
              isSlack={pageType.isSlack}
              onClose={handleClose}
              onRegenerate={handleRegenerate}
            />
            <Messages messages={messages} isTyping={isTyping} />
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

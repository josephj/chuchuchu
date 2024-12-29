import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM, convertToWebUrl, formatRelativeTime } from './utils';
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Link,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, WarningIcon } from '@chakra-ui/icons';
import { Messages } from './Messages';
import { Header } from './Header';
import { useStorage } from './lib/use-storage';
import { usePageType } from './lib/use-page-type';
import { getInitialPrompt, getFollowUpPrompt } from './prompts';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
};

type FormData = {
  question: string;
};

const SidePanel = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [selectedLanguage, setSelectedLanguage] = useStorage<Language['code']>(
    'selectedLanguage',
    DEFAULT_LANGUAGE_CODE,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [showHoverWarning, setShowHoverWarning] = useState(false);
  const [isOnOriginalPage, setIsOnOriginalPage] = useState(true);
  const isInitialLoad = useRef(true);
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
  const [articleContent, setArticleContent] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [contentType, setContentType] = useState<'slack' | 'article' | null>(null);

  const bg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const textColorSecondary = useColorModeValue('gray.600', 'whiteAlpha.700');
  const buttonBg = useColorModeValue('white', 'gray.700');

  const handleAskAssistant = useCallback(
    async (prompt: string, isInitialAnalysis = false) => {
      setIsTyping(true);
      setIsGenerating(true);

      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
      if (!selectedLang) return;

      try {
        const systemPrompt = isInitialAnalysis
          ? getInitialPrompt(pageType, selectedLang)
          : getFollowUpPrompt(selectedLang);

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
      } catch (error) {
        console.error('Failed to process prompt:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Error: Failed to process prompt. Please try again.',
            timestamp: Date.now(),
          },
        ]);
        setIsTyping(false);
        setIsGenerating(false);
      }
    },
    [selectedLanguage, messages, pageType],
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
    setShowWarning(false);
    setShowHoverWarning(false);
    setIsOnOriginalPage(true);
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
        const url = message.url || '';
        setOriginalUrl(url);
        setFormattedUrl(convertToWebUrl(url));
        setContentType('slack');

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
        if (message.data.url) {
          setOriginalUrl(message.data.url);
          setFormattedUrl(message.data.url);
        }
        if (message.data.title) {
          setArticleTitle(message.data.title);
        }
        setContentType('article');

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
    if (!selectedLanguage || isTyping || !isInitialLoad.current) return;

    if (threadData) {
      const formattedData = formatThreadForLLM(threadData);
      setMessages([]);
      handleAskAssistant(formattedData, true);
    } else if (articleContent) {
      setMessages([]);
      handleAskAssistant(articleContent, true);
    }

    isInitialLoad.current = false;
  }, [selectedLanguage, threadData, articleContent, handleAskAssistant, isTyping]);

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
        if (isMatchingUrl) {
          setShowWarning(false);
          setShowHoverWarning(false);
        } else {
          setShowWarning(true);
          setShowHoverWarning(false);
          setTimeout(() => {
            setShowWarning(false);
          }, 3000);
        }
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

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Flex justify="space-between" align="center">
          <LanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} isDisabled={isGenerating} />

          <Flex gap={2}>
            {hasContent && !isOnOriginalPage && (
              <Popover
                isOpen={showWarning || showHoverWarning}
                placement="bottom-end"
                onClose={() => setShowHoverWarning(false)}
                isLazy
                gutter={0}>
                <PopoverTrigger>
                  <Box onMouseEnter={() => setShowHoverWarning(true)} position="relative" p={2} margin={-2}>
                    <IconButton
                      aria-label="Tab change warning"
                      icon={<WarningIcon color="orange.500" />}
                      size="sm"
                      variant="ghost"
                    />
                  </Box>
                </PopoverTrigger>
                <PopoverContent
                  width="250px"
                  onMouseEnter={() => setShowHoverWarning(true)}
                  onMouseLeave={() => setShowHoverWarning(false)}>
                  <PopoverBody>
                    <VStack align="stretch" spacing={2}>
                      <Text fontSize="xs">
                        Please{' '}
                        <Link color="red.500" onClick={handleClose}>
                          close
                        </Link>{' '}
                        this summary or{' '}
                        {pageType.type === 'slack' ? (
                          'generate'
                        ) : (
                          <Link color="blue.500" onClick={handleCapturePage}>
                            generate
                          </Link>
                        )}{' '}
                        a new one for the current page.
                      </Text>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}
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
          <Flex height="100%" direction="column" justify="center" align="center" p={4} gap={1}>
            {pageType.type === 'slack' ? (
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
              threadUrl={contentType === 'slack' ? formattedUrl : originalUrl}
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

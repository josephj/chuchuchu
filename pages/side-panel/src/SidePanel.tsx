import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import { formatThreadForLLM, convertToWebUrl, formatRelativeTime, estimateTokens } from './utils';
import type { Language, ThreadData, ThreadDataMessage, ArticleDataResultMessage, ArticleData } from './types';
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
  Collapse,
  HStack,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ChevronUpIcon, ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';
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

const handleOpenOptions = () => {
  chrome.runtime.openOptionsPage();
};

const SidePanel = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [selectedLanguage, setSelectedLanguage] = useStorage<Language['code']>(
    'selectedLanguage',
    DEFAULT_LANGUAGE_CODE,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnOriginalPage, setIsOnOriginalPage] = useState(true);
  const [originalContent, setOriginalContent] = useState<string>('');
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
  const [articleContent, setArticleContent] = useState<string | ArticleData>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [contentType, setContentType] = useState<'slack' | 'article' | null>(null);
  const [showOriginalContent, setShowOriginalContent] = useState(false);
  const [isThreadPaneAvailable, setIsThreadPaneAvailable] = useState(false);

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

        const messagesWithContext = isInitialAnalysis
          ? []
          : [{ role: 'user' as const, content: originalContent }, ...previousMessages];

        await askAssistant(systemPrompt, prompt, messagesWithContext, {
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
    [selectedLanguage, messages, pageType, originalContent],
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

  const handleRegenerate = useCallback(() => {
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

${articleContent.excerpt ? `## Summary\n${articleContent.excerpt}\n` : ''}

## Content
${articleContent.content || ''}`.trim();

      handleAskAssistant(formattedContent, true);
    }
  }, [threadData, articleContent, handleAskAssistant, pageType.type, articleTitle]);

  useEffect(() => {
    const handleMessage = (
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

${message.data.excerpt ? `## Summary\n${message.data.excerpt}\n` : ''}

## Content
${message.data.content || ''}`.trim();

        setOriginalContent(formattedContent);
        console.log('[DEBUG] formattedContent', formattedContent);
        handleAskAssistant(formattedContent, true);
      } else if (message.type === 'RELOAD_AND_CAPTURE') {
        setIsCapturing(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleAskAssistant, pageType.type]);

  useEffect(() => {
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'loading' && isCapturing) {
        setIsCapturing(true);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  }, [isCapturing]);

  useEffect(() => {
    if (!selectedLanguage || isTyping || !isInitialLoad.current) return;

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

${articleContent.excerpt ? `## Summary\n${articleContent.excerpt}\n` : ''}

## Content
${articleContent.content || ''}`.trim();

      setMessages([]);
      handleAskAssistant(formattedContent, true);
    }

    isInitialLoad.current = false;
  }, [selectedLanguage, threadData, articleContent, handleAskAssistant, isTyping, pageType.type, articleTitle]);

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
    // Clear previous content first
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

    // Set a timeout to reset the capturing state if no data is received
    const timeoutId = setTimeout(() => {
      setIsCapturing(false);
    }, 10000);

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'CAPTURE_ARTICLE' });
      }
    });

    return () => clearTimeout(timeoutId);
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

  return (
    <Flex direction="column" h="100vh" bg={bg} color={textColor}>
      {/* Settings Section */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Flex justify="space-between" align="center">
          <LanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} isDisabled={isGenerating} />

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
          <Flex height="100%" direction="column" justify="center" align="center" p={4} gap={1}>
            {pageType.type === 'slack' ? (
              <VStack spacing={4} width="100%" align="center">
                <Button
                  isDisabled={!isThreadPaneAvailable}
                  colorScheme="blue"
                  leftIcon={<Text>⭐️</Text>}
                  onClick={handleSummarizeSlack}
                  isLoading={isCapturing}
                  loadingText="Capturing thread">
                  Summarize current page
                </Button>
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
              </VStack>
            ) : (
              <VStack spacing={3}>
                <Button
                  onClick={handleCapturePage}
                  colorScheme="blue"
                  leftIcon={<Text>⭐️</Text>}
                  isLoading={isCapturing}
                  loadingText="Capturing page">
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

          {/* Original Content Section */}
          <Box borderTop="1px" borderColor={borderColor}>
            <Button
              width="100%"
              variant="ghost"
              onClick={handleToggleContent}
              rightIcon={showOriginalContent ? <ChevronDownIcon /> : <ChevronUpIcon />}
              size="sm"
              color={textColorSecondary}>
              Original content ({estimateTokens(originalContent)} tokens)
            </Button>
            <Collapse in={showOriginalContent}>
              <Box p={4} maxH="300px" overflowY="auto" fontSize="sm" whiteSpace="pre-wrap">
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
              </Box>
            </Collapse>
          </Box>
        </>
      )}
    </Flex>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);

import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { askAssistant } from './ask-assistant';
import ReactMarkdown from 'react-markdown';
import { formatThreadForLLM } from './utils';
import type { Language, ThreadData, ThreadDataMessage } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './vars';
import { useForm } from 'react-hook-form';
import { RepeatIcon, DeleteIcon } from '@chakra-ui/icons';
import { Tooltip } from '@chakra-ui/react';

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

const SidePanel = () => {
  const isLight = true;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'} flex h-screen flex-col text-left`}>
      {/* Settings Section */}
      <div className={`border-b p-4 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="font-medium">
            Language:
          </label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={e => handleLanguageChange(e.target.value)}
            disabled={isGenerating}
            className={`rounded-md px-3 py-1.5 ${
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isGenerating ? 'cursor-not-allowed opacity-50' : ''
            }`}>
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {pageType.isSlack && (
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor="open-in-web" className="font-medium">
              Open links in web:
            </label>
            <input
              id="open-in-web"
              type="checkbox"
              checked={openInWeb}
              onChange={e => handleOpenInWebChange(e.target.checked)}
              className="size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Main Content Section */}
      <div className="flex-1 overflow-auto">
        {!hasContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-4">
            {pageType.isSlack ? (
              <>
                <span className="text-xs">Click</span>
                <div className="flex h-6 items-center gap-2 rounded-full bg-white px-2 text-gray-900 shadow-lg">
                  <span className="text-xs">⭐️</span>
                  <span className="text-xs">Summarize</span>
                </div>
                <span className="text-xs">in any conversation</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleCapturePage}
                  className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                  <span>⭐️</span>
                  Summarize current page
                </button>
                {pageType.url && (
                  <div className="word-break-all max-w-[300px] text-center text-xs text-gray-500" title={pageType.url}>
                    {pageType.url}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {/* URL Section */}
            {threadUrl && (
              <div
                className={`flex items-center gap-4 border-b pb-4 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
                <Tooltip label={threadUrl} placement="bottom-start" openDelay={500}>
                  <a
                    href={threadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-blue-500 hover:underline"
                    title={threadUrl}>
                    {pageType.isSlack ? formatDisplayUrl(threadUrl) : threadUrl}
                  </a>
                </Tooltip>
                <div className="flex shrink-0 gap-2">
                  <Tooltip label="Clear conversation" placement="top" openDelay={500}>
                    <button
                      onClick={handleClose}
                      className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50">
                      <DeleteIcon className="size-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Regenerate summary" placement="top" openDelay={500}>
                    <button
                      onClick={() => {
                        if (threadData) {
                          const formattedData = formatThreadForLLM(threadData);
                          handleAskAssistant(formattedData, true);
                        } else if (articleContent) {
                          handleAskAssistant(articleContent, true);
                        }
                      }}
                      className="rounded-md p-2 text-blue-500 transition-colors hover:bg-blue-50">
                      <RepeatIcon className="size-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Conversation Section */}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  data-message
                  className={`${
                    message.role === 'assistant' ? 'bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700'
                  } rounded-lg p-4`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              {isTyping && <div className="animate-pulse text-sm text-gray-500">Assistant is typing...</div>}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      {hasContent && (
        <div className={`border-t p-4 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <form onSubmit={handleFormSubmit(onSubmit)} className="flex gap-2">
            <textarea
              {...register('question')}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              rows={3}
              placeholder="Ask a follow-up question... (Cmd/Ctrl + Enter to submit)"
              className={`flex-1 resize-none rounded-md px-3 py-2 ${
                isLight
                  ? 'border-gray-300 bg-white text-gray-900'
                  : 'border-gray-60 opacity-500 bg-gray-700 text-gray-100'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              type="submit"
              disabled={isTyping || !watch('question').trim()}
              className={`rounded-md bg-blue-500 px-4 py-2 text-white ${
                isTyping || !watch('question').trim() ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-600'
              }`}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);

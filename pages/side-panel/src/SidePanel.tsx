import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useCallback } from 'react';
import { askAssistant } from './ask-assistant';
import ReactMarkdown from 'react-markdown';
import { formatThreadForLLM } from './utils';
import type { Language, ThreadData, ThreadDataMessage } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './vars';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
};

type PageType = {
  isSlack: boolean;
  url: string;
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
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadUrl, setThreadUrl] = useState<string>('');
  const [openInWeb, setOpenInWeb] = useState(true);
  const [pageType, setPageType] = useState<PageType>({ isSlack: true, url: '' });
  const [hasContent, setHasContent] = useState(false);
  const [articleContent, setArticleContent] = useState<string>('');

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
    const checkPageType = () => {
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_PAGE_TYPE' });
    };

    checkPageType();
    // Check page type when tab changes
    chrome.tabs.onActivated.addListener(checkPageType);
    chrome.tabs.onUpdated.addListener(checkPageType);

    return () => {
      chrome.tabs.onActivated.removeListener(checkPageType);
      chrome.tabs.onUpdated.removeListener(checkPageType);
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
      } else if (message.type === 'CURRENT_PAGE_TYPE') {
        setPageType({ isSlack: message.isSlack, url: message.url });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const newMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setUserInput('');
    await handleAskAssistant(userInput);
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
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'} flex h-screen flex-col text-left`}>
      <div className={`flex-1 overflow-auto p-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            {hasContent && (
              <button
                onClick={handleClose}
                className="rounded-md bg-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-300"
                title="Close current summary">
                ✕
              </button>
            )}
          </div>
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
        </div>

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
              <button
                onClick={handleCapturePage}
                className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                <span>⭐️</span>
                Summarize Current Page
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {threadUrl && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                Thread URL:
                <a
                  href={threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-500 hover:underline"
                  title={threadUrl}>
                  {formatDisplayUrl(threadUrl)}
                </a>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
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
            </div>
          </div>
        )}
      </div>

      {hasContent && (
        <form onSubmit={handleSubmit} className="border-t p-4 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ask a follow-up question..."
              className={`flex-1 rounded-md px-3 py-2 ${
                isLight
                  ? 'border-gray-300 bg-white text-gray-900'
                  : 'border-gray-60 opacity-500 bg-gray-700 text-gray-100'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              type="submit"
              disabled={isTyping || !userInput.trim()}
              className={`rounded-md bg-blue-500 px-4 py-2 text-white ${
                isTyping || !userInput.trim() ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-600'
              }`}>
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);

import { Readability } from '@mozilla/readability';

export type ArticleData = {
  title: string | null;
  content: string | null;
  excerpt: string | null;
  siteName: string | null;
  byline: string | null;
  url: string;
};

export const captureArticle = () => {
  const handleMessage = (message: { type: string }, _: chrome.runtime.MessageSender, sendResponse: () => void) => {
    console.log('[DEBUG] handleMessage is executed');
    if (message.type === 'CAPTURE_ARTICLE') {
      try {
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        const article = reader.parse();

        if (article) {
          const cleanContent = article.textContent?.replace(/\n{3,}/g, '\n\n').trim();

          chrome.runtime.sendMessage({
            type: 'ARTICLE_DATA_RESULT',
            data: {
              title: article.title,
              content: cleanContent,
              excerpt: article.excerpt,
              siteName: article.siteName,
              byline: article.byline,
              url: window.location.href,
            },
          });
        } else {
          chrome.runtime.sendMessage({
            type: 'ARTICLE_DATA_RESULT',
            data: {
              title: document.title,
              content: document.body.innerText,
              excerpt: null,
              siteName: null,
              byline: null,
              url: window.location.href,
            },
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error);
        sendResponse();
      }
    }
    sendResponse();
  };

  chrome.runtime.onMessage.addListener(handleMessage);
};

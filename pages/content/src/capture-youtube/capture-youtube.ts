import type { YouTubeData } from './types';
import { getTranscript, getDescription, getChannelName, getPublishDate } from './utils';

export const captureYouTube = () => {
  const handleMessage = async (
    message: { type: string },
    _: chrome.runtime.MessageSender,
    sendResponse: () => void,
  ) => {
    if (message.type === 'CAPTURE_ARTICLE') {
      try {
        const transcript = await getTranscript();
        const description = await getDescription();
        const data: YouTubeData = {
          title: document.title.replace('- YouTube', '').trim(),
          description,
          transcript,
          channel: getChannelName(),
          publishDate: getPublishDate(),
          url: window.location.href,
        };
        chrome.runtime.sendMessage({
          type: 'ARTICLE_DATA_RESULT',
          data,
        });
      } catch (error) {
        sendResponse();
      }
    }
    sendResponse();
  };

  chrome.runtime.onMessage.addListener(handleMessage);
};

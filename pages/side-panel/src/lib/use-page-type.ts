import { useState, useEffect } from 'react';
import type { PageType } from '../types';

export const usePageType = () => {
  const [pageType, setPageType] = useState<PageType>({ type: 'default', url: '' });

  useEffect(() => {
    const handlePageTypeUpdate = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (currentTab?.url) {
          const url = currentTab.url;
          let type: PageType['type'] = 'default';

          if (url.includes('slack.com')) {
            type = 'slack';
          } else if (url.includes('youtube.com')) {
            type = 'youtube';
          } else if (url.includes('zoom.us')) {
            type = 'zoom';
          }

          setPageType({ type, url });
        }
      });
    };

    handlePageTypeUpdate();

    chrome.tabs.onActivated.addListener(handlePageTypeUpdate);
    chrome.tabs.onUpdated.addListener((_, changeInfo) => {
      if (changeInfo.url) {
        handlePageTypeUpdate();
      }
    });

    return () => {
      chrome.tabs.onActivated.removeListener(handlePageTypeUpdate);
      chrome.tabs.onUpdated.removeListener(handlePageTypeUpdate);
    };
  }, []);

  return pageType;
};

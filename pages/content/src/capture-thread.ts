export const captureThread = () => {
  if (!window.location.hostname.endsWith('slack.com')) {
    return;
  }

  let hasThreadPane = false;
  let currentThreadInfo: { channel: string; threadTs: string } | null = null;

  const getThreadInfoFromUrl = (url: string) => {
    const channelMatch = url.match(/\/archives\/([A-Z0-9]+)/);
    const tsMatch = url.match(/\/p?(\d+\.\d+)/);

    if (channelMatch && tsMatch) {
      return {
        channel: channelMatch[1],
        threadTs: tsMatch[1],
      };
    }
    return null;
  };

  const checkThreadPane = () => {
    const threadPane = document.querySelector('[data-qa="threads_flexpane"]');

    if (threadPane) {
      const threadInfo = getThreadInfoFromUrl(window.location.href);

      if (!hasThreadPane || (threadInfo && threadInfo.threadTs !== currentThreadInfo?.threadTs)) {
        hasThreadPane = true;
        currentThreadInfo = threadInfo;
        chrome.runtime.sendMessage({
          type: 'THREAD_PANE_AVAILABLE',
          threadInfo,
        });
      }
    } else if (!threadPane && hasThreadPane) {
      hasThreadPane = false;
      currentThreadInfo = null;
      chrome.runtime.sendMessage({ type: 'THREAD_PANE_CLOSED' });
    }
  };

  // Check immediately when script loads
  checkThreadPane();

  const observer = new MutationObserver(checkThreadPane);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'OPEN_IN_WEB_CHANGED') {
      console.log('Open in web preference changed:', message.value);
    } else if (message.type === 'CAPTURE_THREAD' && currentThreadInfo) {
      // Trigger the thread data fetch using the injected script
      window.postMessage(
        {
          type: 'FETCH_THREAD_DATA',
          payload: currentThreadInfo,
        },
        '*',
      );
    }
  });

  const injectScript = () => {
    const scriptEl = document.createElement('script');
    scriptEl.src = chrome.runtime.getURL('injected.js');
    scriptEl.type = 'module';
    (document.head || document.documentElement).appendChild(scriptEl);
    scriptEl.onload = () => {
      window.postMessage({ type: 'ORIGIN', origin: window.location.href }, '*');
    };
  };

  setTimeout(injectScript, 1000);
};

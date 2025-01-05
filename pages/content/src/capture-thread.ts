export const captureThread = () => {
  if (!window.location.hostname.endsWith('slack.com')) {
    return;
  }

  let hasThreadPane = false;
  let currentThreadInfo: { channel: string; threadTs: string } | null = null;

  const getThreadInfoFromTimestamp = () => {
    const timestampLabel = document.querySelector(
      '[data-qa="threads_flexpane"] [data-qa="message_container"] [data-qa="timestamp_label"]',
    )?.parentNode as HTMLAnchorElement;
    if (!timestampLabel?.href) return null;

    const channelMatch = timestampLabel.href.match(/\/archives\/([A-Z0-9]+)/);
    const tsMatch = timestampLabel.href.match(/\/p?(\d{10})(\d{6})/);

    if (channelMatch && tsMatch) {
      const threadTs = `${tsMatch[1]}.${tsMatch[2]}`;
      return {
        channel: channelMatch[1],
        threadTs,
      };
    }
    return null;
  };

  const checkThreadPane = () => {
    const threadPane = document.querySelector('[data-qa="threads_flexpane"]');

    if (threadPane) {
      const threadInfo = getThreadInfoFromTimestamp();

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
    } else if (message.type === 'CHECK_THREAD_PANE') {
      // Check thread pane availability immediately and send the result
      const threadPane = document.querySelector('[data-qa="threads_flexpane"]');
      const threadInfo = threadPane ? getThreadInfoFromTimestamp() : null;

      if (threadPane) {
        hasThreadPane = true;
        currentThreadInfo = threadInfo;
        chrome.runtime.sendMessage({
          type: 'THREAD_PANE_AVAILABLE',
          threadInfo,
        });
      } else {
        hasThreadPane = false;
        currentThreadInfo = null;
        chrome.runtime.sendMessage({ type: 'THREAD_PANE_CLOSED' });
      }
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

export const captureThread = () => {
  if (!window.location.hostname.endsWith('slack.com')) {
    return;
  }

  let hasThreadPane = false;
  let currentThreadInfo: { channel: string; threadTs: string } | null = null;
  let observer: MutationObserver | null = null;

  const getThreadInfoFromTimestamp = () => {
    const timestampLabel = document.querySelector(
      '[data-qa="threads_flexpane"] [data-qa="message_container"] [data-qa="timestamp_label"]',
    )?.parentNode as HTMLAnchorElement;
    if (!timestampLabel?.href) {
      return null;
    }

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

  const setupObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    if (document.body) {
      observer = new MutationObserver(checkThreadPane);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      checkThreadPane();
    } else {
      setTimeout(setupObserver, 100);
    }
  };

  setupObserver();

  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'OPEN_IN_WEB_CHANGED') {
      if (!message.value) {
        const links = document.querySelectorAll('a[href*="slack.com/archives"]');
        links.forEach(link => {
          link.addEventListener('click', e => {
            e.preventDefault();
            return true;
          });
        });
      }
    } else if (message.type === 'CAPTURE_THREAD' && currentThreadInfo) {
      const threadPane = document.querySelector('[data-qa="threads_flexpane"]');
      threadPane?.querySelector('[data-qa="slack_kit_scrollbar"]')?.scrollTo(0, 0);

      setTimeout(() => {
        currentThreadInfo = getThreadInfoFromTimestamp();
        if (currentThreadInfo) {
          window.postMessage(
            {
              type: 'FETCH_THREAD_DATA',
              payload: currentThreadInfo,
            },
            '*',
          );
        }
      }, 100);
    } else if (message.type === 'CHECK_THREAD_PANE') {
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

  const clickThreadReplyBar = (threadTs: string) => {
    const formattedTs = threadTs.replace('p', '').replace('/', '.');
    const messageElement = document.querySelector(`[data-item-key="${formattedTs}"]`);
    if (messageElement) {
      const replyBar = messageElement.querySelector('[data-qa="reply_bar_count"]') as HTMLElement;
      if (replyBar) {
        replyBar.click();
        return true;
      }
    }
    return false;
  };

  const hasThreadTimestamp = (url: string) => {
    return /\/(\d{10})\.(\d{6})/.test(url);
  };

  const tryClickThreadFromUrl = () => {
    const urlMatch = lastUrl.match(/\/(?:p?(\d{10})[./](\d{6}))/);
    if (urlMatch) {
      const threadTs = `${urlMatch[1]}.${urlMatch[2]}`;
      if (!clickThreadReplyBar(threadTs)) {
        setTimeout(() => {
          clickThreadReplyBar(threadTs);
        }, 2000);
      }
    }
  };

  let lastUrl = '';
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && hasThreadTimestamp(currentUrl)) {
      lastUrl = currentUrl;
      tryClickThreadFromUrl();
    }
  });

  urlObserver.observe(document.querySelector('body')!, {
    subtree: true,
    childList: true,
  });

  tryClickThreadFromUrl();
};

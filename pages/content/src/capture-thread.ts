export const captureThread = () => {
  if (!window.location.hostname.endsWith('slack.com')) {
    return;
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'OPEN_IN_WEB_CHANGED') {
      console.log('Open in web preference changed:', message.value);
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

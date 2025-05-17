type Message = {
  type: string;
  screenshot?: string;
};

type Dimensions = {
  width: number;
  height: number;
};

type MessageResponse = {
  type?: string;
  dimensions?: Dimensions;
  isReadable?: boolean;
  screenshot?: string;
};

console.log('[DEBUG] Content script message handler initialized');

// Store the current screenshot
let currentScreenshot: string | null = null;

const getPageDimensions = (): Dimensions => {
  console.log('[DEBUG] Getting page dimensions');
  const width = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
    document.documentElement.clientWidth,
  );

  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    document.documentElement.clientHeight,
  );

  console.log('[DEBUG] Page dimensions:', { width, height });
  return { width, height };
};

const handleMessage = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void,
) => {
  console.log('[DEBUG] Received message:', message);

  // Return true to indicate we will send a response asynchronously
  if (message.type === 'GET_PAGE_DIMENSIONS') {
    const dimensions = getPageDimensions();
    console.log('[DEBUG] Sending dimensions response:', dimensions);
    sendResponse({ dimensions });
    return true;
  }

  if (message.type === 'GET_CURRENT_SCREENSHOT') {
    if (currentScreenshot) {
      sendResponse({ type: 'SCREENSHOT_READY', screenshot: currentScreenshot });
    } else {
      sendResponse({ type: 'SCREENSHOT_ERROR' });
    }
    return true;
  }

  if (message.type === 'CAPTURE_SCREENSHOT') {
    if (message.screenshot) {
      console.log('[DEBUG] Received screenshot data');
      currentScreenshot = message.screenshot;
      sendResponse({ type: 'SCREENSHOT_CAPTURED' });
      return true;
    }
  }

  if (message.type === 'CHECK_READABILITY') {
    console.log('[DEBUG] Checking readability');
    // Implement readability check if needed
    sendResponse({ type: 'READABILITY_RESULT', isReadable: true });
    return true;
  }

  if (message.type === 'CAPTURE_SELECTION') {
    console.log('[DEBUG] Capturing selection');
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      sendResponse({ type: 'SELECTION_CAPTURED' });
      return true;
    }
  }

  // If we get here, we didn't handle the message
  console.log('[DEBUG] Message not handled:', message);
  return false;
};

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(handleMessage);

// Notify the extension when selection changes
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  chrome.runtime.sendMessage({
    type: 'SELECTION_CHANGED',
    hasSelection: selection ? selection.toString().trim().length > 0 : false,
    selectedText: selection ? selection.toString().trim() : '',
  });
});

export const initializeMessageHandler = () => {
  const getPageDimensions = () => {
    const width = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      document.documentElement.clientWidth,
    );

    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight,
    );

    return { width, height };
  };

  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ type: 'PONG' });
      return true;
    }

    if (message.type === 'GET_PAGE_DIMENSIONS') {
      const dimensions = getPageDimensions();
      sendResponse({ dimensions });
      return true;
    }

    if (message.type === 'CAPTURE_SCREENSHOT') {
      if (message.screenshot) {
        sendResponse({ type: 'SCREENSHOT_CAPTURED' });
        return true;
      }
    }

    if (message.type === 'CHECK_READABILITY') {
      const isReadable = checkReadability();
      sendResponse({ type: 'READABILITY_RESULT', isReadable });
      return true;
    }

    if (message.type === 'CAPTURE_SELECTION') {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';
      if (selectedText) {
        sendResponse({
          type: 'SELECTION_CAPTURED',
          content: selectedText,
          url: window.location.href,
          title: document.title,
        });
      }
      return true;
    }

    return false;
  });
};

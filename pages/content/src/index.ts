import { captureThread } from './capture-thread';
import { captureArticle } from './capture-article';
import { captureYouTube } from './capture-youtube';
import { captureZoom } from './capture-zoom';
import { capturePDF } from './capture-pdf';

const isSlackDomain = window.location.hostname.endsWith('slack.com');
const isYouTubeDomain = window.location.hostname.endsWith('youtube.com');
const isZoomDomain = window.location.hostname.endsWith('zoom.us');

const isPDFFile = (): boolean => {
  try {
    // Check URL for PDF extension (including query parameters)
    const url = new URL(window.location.href);
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith('.pdf')) {
      return true;
    }

    // Check content type from meta tag
    const contentTypeMeta = document.querySelector('meta[http-equiv="Content-Type"]');
    if (contentTypeMeta?.getAttribute('content')?.toLowerCase().includes('application/pdf')) {
      return true;
    }

    // Check if PDF.js viewer is present
    if (document.querySelector('#viewerContainer')) {
      return true;
    }

    // Check response headers for PDF content type
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', window.location.href, false);
    xhr.send();
    const contentType = xhr.getResponseHeader('Content-Type');
    if (contentType?.toLowerCase().includes('application/pdf')) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Error checking if file is PDF:', error);
    return false;
  }
};

// Track text selection state
let hasSelection = false;
let selectedText = '';

// Listen for selection changes
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const newSelectedText = selection?.toString().trim() || '';
  const newHasSelection = newSelectedText.length > 0;

  if (newHasSelection !== hasSelection || newSelectedText !== selectedText) {
    hasSelection = newHasSelection;
    selectedText = newSelectedText;
    // Notify the extension about selection change
    chrome.runtime.sendMessage({
      type: 'SELECTION_CHANGED',
      hasSelection,
      selectedText,
    });
  }
});

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

  if (message.type === 'GET_SCREENSHOT') {
    // Get the current screenshot from the background script
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_SCREENSHOT' }, response => {
      if (response?.screenshot) {
        sendResponse({ type: 'SCREENSHOT_READY', screenshot: response.screenshot });
      } else {
        sendResponse({ type: 'SCREENSHOT_ERROR' });
      }
    });
    return true;
  }

  if (message.type === 'CAPTURE_SCREENSHOT') {
    if (message.screenshot) {
      sendResponse({ type: 'SCREENSHOT_CAPTURED' });
      return true;
    }
  }

  if (message.type === 'CHECK_SELECTION') {
    const selection = window.getSelection();
    selectedText = selection?.toString().trim() || '';
    hasSelection = selectedText.length > 0;
    sendResponse({ hasSelection, selectedText });
    return true;
  }

  if (message.type === 'CAPTURE_SELECTION') {
    const selection = window.getSelection();
    selectedText = selection?.toString().trim() || '';
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

  if (message.type === 'CAPTURE_ARTICLE') {
    if (isYouTubeDomain) {
      // Let the YouTube capture handle it
      return true;
    }

    if (isPDFFile()) {
      capturePDF().then(pdfData => {
        if (pdfData) {
          chrome.runtime.sendMessage({
            type: 'ARTICLE_DATA_RESULT',
            data: pdfData,
          });
        }
      });
    }
    return true;
  }

  return false;
});

if (isPDFFile()) {
  // Handle PDF file
  chrome.runtime.sendMessage({
    type: 'PDF_DETECTED',
    url: window.location.href,
    title: document.title,
  });
} else if (isSlackDomain) {
  captureThread();
} else if (isYouTubeDomain) {
  captureYouTube();
} else if (isZoomDomain) {
  captureZoom();
} else {
  captureArticle();
}

import { captureThread } from './capture-thread';
import { captureArticle } from './capture-article';
import { captureYouTube } from './capture-youtube';
import { captureZoom } from './capture-zoom';

const isSlackDomain = window.location.hostname.endsWith('slack.com');
const isYouTubeDomain = window.location.hostname.endsWith('youtube.com');
const isZoomDomain = window.location.hostname.endsWith('zoom.us');

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

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
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

  return false;
});

if (isSlackDomain) {
  captureThread();
} else if (isYouTubeDomain) {
  captureYouTube();
} else if (isZoomDomain) {
  captureZoom();
} else {
  captureArticle();
}

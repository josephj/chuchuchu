import { captureThread } from './capture-thread';
import { captureArticle } from './capture-article';
import { captureYouTube } from './capture-youtube';
import { captureZoom } from './capture-zoom';

const isSlackDomain = window.location.hostname.endsWith('slack.com');
const isYouTubeDomain = window.location.hostname.endsWith('youtube.com');
const isZoomDomain = window.location.hostname.endsWith('zoom.us');

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
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

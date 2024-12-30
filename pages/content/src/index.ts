import { captureThread } from './capture-thread';
import { captureArticle } from './capture-article';
import { captureYouTube } from './capture-youtube';

const isSlackDomain = window.location.hostname.endsWith('slack.com');
const isYouTubeDomain = window.location.hostname.endsWith('youtube.com');

if (isSlackDomain) {
  captureThread();
} else if (isYouTubeDomain) {
  captureYouTube();
} else {
  captureArticle();
}

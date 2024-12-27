import { captureThread } from './capture-thread';
import { captureArticle } from './capture-article';

const isSlackDomain = window.location.hostname.endsWith('slack.com');

if (isSlackDomain) {
  captureThread();
} else {
  captureArticle();
}

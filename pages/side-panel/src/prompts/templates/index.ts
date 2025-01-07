import slackInitial from './slack-initial.md?raw';
import youtubeInitial from './youtube-initial.md?raw';
import defaultInitial from './default-initial.md?raw';
import zoomInitial from './zoom-initial.md?raw';
import followUp from './follow-up.md?raw';

export const templates = {
  slack: slackInitial,
  youtube: youtubeInitial,
  default: defaultInitial,
  zoom: zoomInitial,
  followUp,
} as const;

import type { HatConfig } from '../../types';
import prompt from './system.md?raw';

export const config: HatConfig = {
  alias: 'slack',
  label: 'Slack',
  model: 'llama-3.1-8b-instant',
  temperature: 0,
  urlPattern: 'https://*.slack.com/*',
  prompt,
};

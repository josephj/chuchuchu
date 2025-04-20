import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_youtube',
  alias: 'youtube',
  label: 'YouTube',
  model: 'qwen-qwq-32b',
  temperature: 0,
  urlPattern: 'https://*.youtube.com/*',
  prompt,
};

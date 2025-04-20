import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_zoom',
  alias: 'zoom',
  label: 'Zoom',
  model: 'qwen-qwq-32b',
  temperature: 0,
  urlPattern: 'https://*.zoom.us/*',
  prompt,
};

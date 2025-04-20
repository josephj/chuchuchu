import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_default',
  alias: 'default',
  label: 'Default',
  model: 'qwen-qwq-32b',
  temperature: 0,
  urlPattern: '*',
  prompt,
};

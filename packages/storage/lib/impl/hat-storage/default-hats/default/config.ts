import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_default',
  alias: 'default',
  label: 'Default',
  model: 'deepseek-r1-distill-qwen-32b',
  temperature: 0,
  urlPattern: '*',
  prompt,
};

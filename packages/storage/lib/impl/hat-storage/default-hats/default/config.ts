import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_default',
  alias: 'default',
  label: 'Default',
  model: 'openai/gpt-oss-120b',
  temperature: 0,
  urlPattern: '*',
  prompt,
};

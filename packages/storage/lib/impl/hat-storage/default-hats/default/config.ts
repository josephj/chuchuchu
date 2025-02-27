import type { HatConfig } from '../../types';
import prompt from './system.md?raw';

export const config: HatConfig = {
  alias: 'default',
  label: 'Default',
  model: 'llama-3.1-8b-instant',
  temperature: 0,
  urlPattern: '*',
  prompt,
};

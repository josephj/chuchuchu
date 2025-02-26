import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'default',
  label: 'Default',
  model: 'llama-3.1-8b-instant',
  temperature: 0,
  urlPatterns: ['*'],
  prompt,
};

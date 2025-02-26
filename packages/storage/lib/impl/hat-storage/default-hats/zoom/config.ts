import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'zoom',
  label: 'Zoom',
  model: 'llama-3.1-8b-instant',
  temperature: 0,
  urlPatterns: ['*://*.zoom.us/*'],
  prompt,
};

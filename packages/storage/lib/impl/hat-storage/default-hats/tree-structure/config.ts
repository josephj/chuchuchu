import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_tree_structure',
  alias: 'tree_structure',
  label: 'Tree Structure',
  model: 'deepseek-r1-distill-qwen-32b',
  temperature: 0,
  urlPattern: 'https://*.youtube.com/*',
  prompt,
};

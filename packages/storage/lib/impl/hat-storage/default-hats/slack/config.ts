import type { Hat } from '../../types';
import prompt from './system.md?raw';

export const config: Hat = {
  id: 'hat_default_slack',
  alias: 'slack',
  label: 'Slack',
  model: 'openai/gpt-oss-120b',
  temperature: 0,
  urlPattern: 'https://*.slack.com/*',
  prompt,
};

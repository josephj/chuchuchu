import type { Language } from '../types';
import { replaceTokens } from './utils';
import { templates } from './templates';

export const getFollowUpPrompt = (language: Language): string => {
  return replaceTokens(templates.followUp, { language });
};

import type { PageType, Language } from '../types';
import { replaceTokens } from './utils';
import { templates } from './templates';

export const getInitialPrompt = (pageType: PageType, language: Language): string => {
  const template = templates[pageType.type];
  return replaceTokens(template, { language });
};

export const getFollowUpPrompt = (language: Language): string => {
  return replaceTokens(templates.followUp, { language });
};

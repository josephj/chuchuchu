import type { ArticleData, PageType } from '../types';

/**
 * Formats the article content based on the type of page
 *
 * @param articleContent - The content of the article
 * @param pageType - The type of page (youtube, default, etc.)
 * @param articleTitle - The title of the article
 * @returns A formatted string representation of the content
 */
export const formatArticleContent = (
  articleContent: string | ArticleData,
  pageType: PageType,
  articleTitle: string,
): string => {
  // If content is already a string, return it as is
  if (typeof articleContent === 'string') {
    return articleContent;
  }

  // Format YouTube content
  if (pageType.type === 'youtube') {
    return `---
title: ${articleTitle || ''}
${articleContent.channel ? `channel: ${articleContent.channel}` : ''}
${articleContent.publishDate ? `published: ${articleContent.publishDate}` : ''}
type: youtube
---

${articleContent.description ? `## Description\n${articleContent.description}` : 'No description available'}

${articleContent.transcript ? `## Transcript\n${articleContent.transcript}` : ''}`;
  }

  // Format default article content
  return `---
title: ${articleTitle || ''}
${articleContent.siteName ? `source: ${articleContent.siteName}` : ''}
${articleContent.byline ? `author: ${articleContent.byline}` : ''}
type: article
---

${articleContent.excerpt ? `Summary: \n${articleContent.excerpt}\n` : ''}

${articleContent.content || ''}`.trim();
};

import type { ThreadData } from './types';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Hat } from '../../options/src/types';

export const convertToWebUrl = (url: string): string => {
  return url.replace('/archives/', '/messages/').replace(/&cid=[^&]+/, '');
};

export const formatThreadForLLM = (threadData: ThreadData) => {
  const messages = threadData.messages.map(message => ({
    user: message.user,
    content: message.text,
    timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
    reactions:
      message.reactions?.map(reaction => ({
        emoji: reaction.name,
        count: reaction.count,
      })) || [],
  }));

  return `---
type: slack
channel: ${threadData.channel}
messages_count: ${messages.length}
---

${messages
  .map(
    message => `## ${message.user} (${message.timestamp})
${message.content}
${message.reactions.length > 0 ? `\nReactions: ${message.reactions.map(r => `${r.emoji} (${r.count})`).join(', ')}` : ''}`,
  )
  .join('\n\n')}`.trim();
};

export const formatRelativeTime = (timestamp: number): string => {
  return formatDistanceToNowStrict(timestamp, { addSuffix: true });
};

// Rough estimate of GPT tokens based on characters
export const estimateTokens = (text: string): number => {
  // GPT models typically use ~4 characters per token on average for English text
  return Math.ceil(text.length / 4);
};

/**
 * Calculate the specificity of a URL pattern.
 * More specific patterns (with more static parts) get higher scores.
 */
export const calculatePatternSpecificity = (pattern: string): number => {
  if (!pattern) return 0;

  const parts = pattern.split('/');
  let score = 0;

  for (const part of parts) {
    if (part === '*') {
      score += 1; // Wildcard parts add less weight
    } else if (part === '**') {
      score += 0.5; // Double wildcards add even less weight
    } else if (part) {
      score += 2; // Static parts add more weight
    }
  }

  return score;
};

/**
 * Check if a URL matches a pattern.
 * Supports * for single segment wildcards and ** for multiple segment wildcards.
 */
export const matchUrlPattern = (url: string, pattern: string): boolean => {
  if (!pattern) return false;

  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\*\*/g, '.*') // ** matches any characters
    .replace(/\*/g, '.*'); // * matches everything after this point

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
};

/**
 * Find the best matching hat for a URL from a list of hats.
 * Returns undefined if no hat matches.
 */
export const findBestMatchingHat = (url: string, hats: Hat[]): Hat | undefined => {
  if (!url || !hats?.length) return undefined;

  // Filter hats with matching URL patterns and sort by specificity and position
  const matchingHats = hats
    .filter(hat => {
      if (!hat.urlPattern) return false;
      return matchUrlPattern(url, hat.urlPattern);
    })
    .sort((a, b) => {
      const specificityA = calculatePatternSpecificity(a.urlPattern || '');
      const specificityB = calculatePatternSpecificity(b.urlPattern || '');

      // First sort by specificity
      if (specificityA !== specificityB) {
        return specificityB - specificityA;
      }

      // If specificity is the same, sort by position
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });

  return matchingHats[0];
};

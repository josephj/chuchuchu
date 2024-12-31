import type { ThreadData } from './types';
import { formatDistanceToNowStrict } from 'date-fns';

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

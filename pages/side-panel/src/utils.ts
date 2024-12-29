import type { ThreadData } from './types';
import { formatDistanceToNowStrict } from 'date-fns';

export const convertToWebUrl = (url: string): string => {
  return url.replace('/archives/', '/messages/').replace(/&cid=[^&]+/, '');
};

export const formatThreadForLLM = (threadData: ThreadData) => {
  return JSON.stringify(
    {
      channel: threadData.channel,
      messages: threadData.messages.map(message => ({
        user: message.user,
        content: message.text,
        timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
        reactions:
          message.reactions?.map(reaction => ({
            emoji: reaction.name,
            count: reaction.count,
          })) || [],
      })),
    },
    null,
    2,
  );
};

export const formatRelativeTime = (timestamp: number): string => {
  return formatDistanceToNowStrict(timestamp, { addSuffix: true });
};

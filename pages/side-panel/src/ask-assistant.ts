import { handleGroqStream } from './groq-handler';
import { type AskAssistantOptions } from './types';

type Message = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

type AskAssistantParams = {
  systemPrompt: string;
  userPrompt: string;
  previousMessages?: Message[];
  options: AskAssistantOptions;
  model?: string;
  temperature?: number;
};

export const askAssistant = async ({
  systemPrompt,
  userPrompt,
  previousMessages = [],
  options,
  model,
  temperature,
}: AskAssistantParams) => {
  const abortController = new AbortController();

  try {
    const messages: Message[] = [...previousMessages, { role: 'user', content: userPrompt }];

    const fullResponse = await handleGroqStream({
      systemPrompt,
      messages,
      options,
      abortController,
      model,
      temperature,
    });
    options.onComplete?.(fullResponse);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        options.onAbort?.();
      } else {
        options.onError?.(error);
      }
    }
  }

  return abortController;
};

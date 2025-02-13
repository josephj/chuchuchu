import { handleGroqStream } from './groq-handler';
import { handleOllamaStream } from './ollama-handler';
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
  model = 'llama-3.1-8b-instant',
  temperature,
}: AskAssistantParams) => {
  const abortController = new AbortController();

  try {
    const messages: Message[] = [...previousMessages, { role: 'user', content: userPrompt }];

    const isOllamaModel = model?.toLowerCase().startsWith('ollama/');

    const actualModel = isOllamaModel ? model.replace(/^ollama\//i, '') : model;

    let fullResponse: string;

    if (isOllamaModel) {
      fullResponse = await handleOllamaStream({
        systemPrompt,
        messages,
        options,
        abortController,
        model: actualModel,
        temperature,
      });
    } else {
      fullResponse = await handleGroqStream({
        systemPrompt,
        messages,
        options,
        abortController,
        model: actualModel,
        temperature,
      });
    }

    // Check if response is empty or only whitespace
    if (!fullResponse?.trim()) {
      throw new Error('Empty response received');
    }

    options.onComplete?.(fullResponse);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        options.onAbort?.();
      } else {
        console.error('Error in askAssistant:', error);
        options.onError?.(error);
      }
    }
  }

  return abortController;
};

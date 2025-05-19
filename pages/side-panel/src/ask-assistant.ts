import { handleGroqStream } from './groq-handler';
import { handleOllamaStream } from './ollama-handler';
import { handleOpenAIStream } from './openai-handler';
import { handleAnthropicStream } from './anthropic-handler';
import { type AskAssistantOptions } from './types';

type GroqMessageContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
};

type GroqMessage = {
  role: 'system' | 'assistant' | 'user';
  content: string | GroqMessageContent[];
};

type StandardMessage = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

type AskAssistantParams = {
  systemPrompt: string;
  userPrompt: string;
  previousMessages?: StandardMessage[];
  options: AskAssistantOptions;
  model?: string;
  temperature?: number;
  screenshot?: string;
};

export const askAssistant = async ({
  systemPrompt,
  userPrompt,
  previousMessages = [],
  options,
  model = 'llama-3.1-8b-instant',
  temperature,
  screenshot,
}: AskAssistantParams) => {
  const abortController = new AbortController();

  try {
    // If screenshot is provided, use meta-llama/llama-4-scout-17b-16e-instruct model
    const actualModel = screenshot
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : model?.toLowerCase().startsWith('ollama/')
        ? model.replace(/^ollama\//i, '')
        : model?.toLowerCase().startsWith('openai/')
          ? model.replace(/^openai\//i, '')
          : model?.toLowerCase().startsWith('anthropic/')
            ? model.replace(/^anthropic\//i, '')
            : model;

    let fullResponse: string;

    const messages: StandardMessage[] = [
      ...previousMessages,
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    if (screenshot) {
      // Create message with screenshot for Groq
      const userMessage: GroqMessage = {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: screenshot,
            },
          },
        ],
      };

      const groqMessages: GroqMessage[] = [
        ...previousMessages.map(msg => ({
          ...msg,
          content: typeof msg.content === 'string' ? msg.content : (msg.content as GroqMessageContent[])[0].text || '',
        })),
        userMessage,
      ];

      // Use Groq for meta-llama model
      fullResponse = await handleGroqStream({
        systemPrompt,
        messages: groqMessages,
        options,
        abortController,
        model: actualModel,
        temperature,
      });
    } else if (model?.toLowerCase().startsWith('ollama/')) {
      fullResponse = await handleOllamaStream({
        systemPrompt,
        messages,
        options,
        abortController,
        model: actualModel,
        temperature,
      });
    } else if (model?.toLowerCase().startsWith('openai/')) {
      fullResponse = await handleOpenAIStream({
        systemPrompt,
        messages,
        options,
        abortController,
        model: actualModel,
        temperature,
      });
    } else if (model?.toLowerCase().startsWith('anthropic/')) {
      fullResponse = await handleAnthropicStream({
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

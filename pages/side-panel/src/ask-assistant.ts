import { handleGroqStream } from './groq-handler';
import { handleOllamaStream } from './ollama-handler';
import { handleOpenAIStream } from './openai-handler';
import { handleAnthropicStream } from './anthropic-handler';
import { type AskAssistantOptions } from './types';
import { SUPPORTED_MODELS } from '../../options/src/vars';

// Groq's own model catalog uses org-prefixed IDs (e.g. "openai/gpt-oss-120b") that collide
// with this file's provider-prefix convention for custom models. Built-in Groq models must
// always route to Groq regardless of their prefix.
const isBuiltInGroqModel = (model?: string) => SUPPORTED_MODELS.some(m => m.value === model);

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
  model = 'openai/gpt-oss-20b',
  temperature,
  screenshot,
}: AskAssistantParams) => {
  const abortController = new AbortController();

  try {
    const isBuiltInGroq = isBuiltInGroqModel(model);

    // If screenshot is provided, use qwen/qwen3.6-27b (vision-capable) model
    const actualModel = screenshot
      ? 'qwen/qwen3.6-27b'
      : isBuiltInGroq
        ? model
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
    } else if (isBuiltInGroq) {
      fullResponse = await handleGroqStream({
        systemPrompt,
        messages,
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

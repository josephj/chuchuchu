import OpenAI from 'openai';
import { openAIKeyStorage } from '../../options/src/vars';
import { type AskAssistantOptions } from './types';

type Message = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

const DEFAULT_MODEL = 'gpt-4o-mini-2024-07-18';
const DEFAULT_TEMPERATURE = 0;

type HandleOpenAIStreamParams = {
  systemPrompt: string;
  messages: Message[];
  options: AskAssistantOptions;
  abortController: AbortController;
  model?: string;
  temperature?: number;
};

export const handleOpenAIStream = async ({
  systemPrompt,
  messages,
  options,
  abortController,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
}: HandleOpenAIStreamParams) => {
  let fullResponse = '';

  const openaiToken = await openAIKeyStorage.get();
  if (!openaiToken) {
    throw new Error('OpenAI API token not found');
  }

  const openai = new OpenAI({
    apiKey: openaiToken,
    dangerouslyAllowBrowser: true,
  });

  const stream = await openai.chat.completions.create(
    {
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature,
      stream: true,
    },
    { signal: abortController.signal },
  );

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    options.onUpdate?.(fullResponse);
  }

  return fullResponse;
};

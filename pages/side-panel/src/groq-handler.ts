import { type AskAssistantOptions } from './types';

type Message = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_TEMPERATURE = 0;

const REASONING_MODELS = ['deepseek-r1-distill-llama-70b', 'qwen-qwq-32b'] as const;

type HandleGroqStreamParams = {
  systemPrompt: string;
  messages: Message[];
  options: AskAssistantOptions;
  abortController: AbortController;
  model?: string;
  temperature?: number;
};

export const handleGroqStream = async ({
  systemPrompt,
  messages,
  options,
  abortController,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
}: HandleGroqStreamParams) => {
  let fullResponse = '';
  const response = await fetch(
    'https://australia-southeast1-automatic-stand-up-report.cloudfunctions.net/chatCompletions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          REASONING_MODELS.includes(model as (typeof REASONING_MODELS)[number])
            ? { role: 'user', content: systemPrompt }
            : { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature,
        stream: true,
        ...(REASONING_MODELS.includes(model as (typeof REASONING_MODELS)[number]) && {
          reasoning_format: 'hidden',
        }),
      }),
      signal: abortController.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  const decoder = new TextDecoder();
  let buffer = ''; // Add buffer for incomplete chunks

  let isReading = true;
  while (isReading) {
    const { done, value } = await reader.read();
    if (done) {
      isReading = false;
      break;
    }

    const chunk = decoder.decode(value);
    buffer += chunk;

    // Split by newlines and process complete lines
    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.content || '';
          fullResponse += content;
          options.onUpdate?.(fullResponse);
        } catch (e) {
          console.error('Error parsing JSON:', e, 'Line:', trimmedLine);
        }
      }
    }
  }

  return fullResponse;
};

import { type AskAssistantOptions } from './types';

type Message = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

type OllamaHandlerParams = {
  systemPrompt: string;
  messages: Message[];
  options: AskAssistantOptions;
  abortController: AbortController;
  model: string;
  temperature?: number;
};

export const handleOllamaStream = async ({
  systemPrompt,
  messages,
  options,
  abortController,
  model,
  temperature = 0.7,
}: OllamaHandlerParams): Promise<string> => {
  const formattedMessages = [{ role: 'system', content: systemPrompt }, ...messages];

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        options: {
          temperature,
        },
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line) continue;

        try {
          const data = JSON.parse(line);

          if (data.done) {
            continue;
          }

          const content = data.message?.content || '';
          fullResponse += content;
          options.onToken?.(content);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      }
    }

    return fullResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
};

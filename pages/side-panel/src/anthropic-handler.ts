import { anthropicApiKeyStorage } from '../../options/src/vars';
import { type AskAssistantOptions } from './types';

type Message = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

type AnthropicStreamParams = {
  systemPrompt: string;
  messages: Message[];
  options: AskAssistantOptions;
  abortController: AbortController;
  model: string;
  temperature?: number;
};

export const handleAnthropicStream = async ({
  systemPrompt,
  messages,
  options,
  abortController,
  model,
  temperature = 0.7,
}: AnthropicStreamParams): Promise<string> => {
  const apiKey = await anthropicApiKeyStorage.get();
  if (!apiKey) {
    throw new Error('Anthropic API key not found');
  }

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(msg => ({
    role: msg.role === 'system' ? 'user' : msg.role,
    content: msg.content,
  }));

  // Add system prompt as the first message
  anthropicMessages.unshift({
    role: 'user',
    content: systemPrompt,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      temperature,
      stream: true,
      max_tokens: 4096,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Anthropic API');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  try {
    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullResponse += parsed.delta.text;
              options.onUpdate?.(fullResponse);
            }
          } catch (e) {
            console.error('Error parsing Anthropic stream data:', e);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`Error reading Anthropic stream: ${error.message}`);
    }
    throw error;
  }

  return fullResponse;
};

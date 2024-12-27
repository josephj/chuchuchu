export type Language = {
  code: string;
  name: string;
};

export type ThreadData = {
  channel: string;
  messages: Array<{
    text: string;
    user: string;
    ts: string;
    reactions: Array<{
      name: string;
      count: number;
    }>;
  }>;
};

export type ThreadDataMessage = {
  type: 'THREAD_DATA_RESULT';
  payload: ThreadData;
  url?: string;
};

export type ErrorResponse = {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
};

type ChatCompletionMessageRole = 'system' | 'user' | 'assistant';

export type ChatCompletionOptions = {
  model: string;
  messages: Array<{
    role: ChatCompletionMessageRole;
    content: string;
  }>;
  temperature: number;
  stream: boolean;
  max_tokens?: number;
};

export type AskAssistantOptions = {
  onAbort?: () => void;
  onError?: (error: Error) => void;
  onUpdate?: (response: string) => void;
  onComplete?: (fullResponse: string) => void;
};

export type PageTypeMessage = {
  type: 'CURRENT_PAGE_TYPE';
  isSlack: boolean;
  url: string;
};

export type GetPageTypeMessage = {
  type: 'GET_CURRENT_PAGE_TYPE';
};

export type ArticleData = {
  title: string | null;
  content: string | null;
  excerpt: string | null;
  siteName: string | null;
  byline: string | null;
  url: string;
};

export type CaptureArticleMessage = {
  type: 'CAPTURE_ARTICLE';
};

export type ArticleDataResultMessage = {
  type: 'ARTICLE_DATA_RESULT';
  data: ArticleData;
};

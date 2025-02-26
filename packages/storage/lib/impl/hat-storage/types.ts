export type HatListItem = {
  id: string;
  label: string;
  language?: string;
};

export type Hat = {
  id: string;
  label: string;
  language?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  urlPatterns?: string[];
};

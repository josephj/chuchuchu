export type HatListItem = {
  id: string;
  label: string;
  language?: string;
};

export type Hat = {
  id: string;
  alias: string | undefined;
  label: string;
  language?: string;
  model: string;
  prompt: string;
  temperature: number;
  urlPattern?: string;
};

export type HatConfig = Omit<Hat, 'id'>;

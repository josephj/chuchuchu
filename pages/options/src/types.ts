import { z } from 'zod';

export type Language = {
  code: string;
  name: string;
  value: string;
  label: string;
};

export type Hat = {
  id: string;
  alias: string | undefined;
  label: string;
  prompt: string;
  temperature: number;
  language: string;
  model: string;
  urlPattern?: string;
};

export type Hats = Hat[];

// Add new types for the hat list
export type HatListItem = Pick<Hat, 'id' | 'label' | 'alias' | 'urlPattern' | 'model' | 'language'>;

export type HatList = HatListItem[];

export const hatSchema = z.object({
  id: z.string(),
  alias: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  temperature: z.number().min(0).max(2.5),
  language: z.string(),
  model: z.string(),
  urlPattern: z.string().optional(),
});

export const optionsFormSchema = z.object({
  language: z.string(),
  theme: z.boolean(),
  openInWeb: z.boolean(),
  hats: z.array(hatSchema).default([]),
});

export type OptionsFormData = z.infer<typeof optionsFormSchema>;

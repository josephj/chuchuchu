import { z } from 'zod';

export type Language = {
  code: string;
  name: string;
  value: string;
  label: string;
};

export type Hat = {
  id: string;
  label: string;
  prompt: string;
  temperature: number;
  language: string;
  model: string;
  urlPattern?: string;
};

export type Hats = Hat[];

const hatIdRegex = /^[a-zA-Z0-9_-]+$/;

export const hatSchema = z.object({
  id: z.string().regex(hatIdRegex, 'Only English, numbers, dash, and underline allowed'),
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

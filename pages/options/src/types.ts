import { z } from 'zod';

export type Language = {
  code: string;
  name: string;
  value: string;
  label: string;
};

export type Hats = Hat[];

// Add new types for the hat list
export type HatListItem = Pick<Hat, 'id' | 'label' | 'urlPattern' | 'model' | 'language'>;

export type HatList = HatListItem[];

export const hatSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  temperature: z.number().min(0).max(2.5),
  language: z.string().optional(),
  model: z.string(),
  urlPattern: z.string().optional(),
  position: z.number().optional(),
  alias: z.string().optional(),
});

export type OptionsFormData = {
  language: string;
  theme: boolean;
  openInWeb: boolean;
  mode: 'simple' | 'advanced';
  hats: Hat[];
};

export const optionsFormSchema = z.object({
  language: z.string(),
  theme: z.boolean(),
  openInWeb: z.boolean(),
  mode: z.enum(['simple', 'advanced']),
  hats: z.array(hatSchema),
});
export type Hat = z.infer<typeof hatSchema>;

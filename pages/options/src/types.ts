import { z } from 'zod';

export type Language = {
  code: string;
  name: string;
  value: string;
  label: string;
};

export type UrlPattern = {
  pattern: string;
  model: string;
  prompt: string;
};

export const urlPatternSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  model: z.string().min(1, 'Model is required'),
  prompt: z.string().min(1, 'Prompt is required'),
});

export const optionsFormSchema = z.object({
  language: z.string(),
  theme: z.boolean(),
  openInWeb: z.boolean(),
  openAIKey: z.string(),
  anthropicKey: z.string(),
  deepseekKey: z.string(),
  googleKey: z.string(),
  ollamaUrl: z.string(),
  groqKey: z.string(),
  urlPatterns: z.array(urlPatternSchema),
});

export type OptionsFormData = z.infer<typeof optionsFormSchema>;

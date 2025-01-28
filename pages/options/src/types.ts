import { z } from 'zod';

export type Language = {
  code: string;
  name: string;
  value: string;
  label: string;
};

export const optionsFormSchema = z.object({
  language: z.string(),
  theme: z.boolean(),
  openInWeb: z.boolean(),
});

export type OptionsFormData = z.infer<typeof optionsFormSchema>;

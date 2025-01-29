import ISO6391 from 'iso-639-1';

// Get all ISO-639-1 languages and add custom regional variants
const baseLanguages = ISO6391.getAllCodes().map(code => ({
  code,
  name: `${ISO6391.getNativeName(code)} - ${ISO6391.getName(code)}`,
}));

// Add custom regional variants
const regionalVariants = [
  { code: 'zh-TW', name: '繁體中文 (台灣)' },
  { code: 'zh-CN', name: '简体中文 (中国)' },
  { code: 'zh-HK', name: '繁體中文 (香港)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-AU', name: 'English (Australia)' },
];

// Convert to react-select options format
export const SUPPORTED_LANGUAGES = [...regionalVariants, ...baseLanguages].map(lang => ({
  value: lang.code,
  label: lang.name,
  code: lang.code,
  name: lang.name,
}));

export const DEFAULT_LANGUAGE_CODE = 'zh-TW';

export const SUPPORTED_MODELS = [
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K context)' },
  { value: 'llama3-70b-8192', label: 'LLaMA3 70B' },
  { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B Versatile' },
  { value: 'llama3-8b-8192', label: 'LLaMA3 8B' },
  { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B Instant' },
  { value: 'gemma2-9b-it', label: 'Gemma2 9B Instruct' },
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill LLaMA 70B' },
] as const;

export const DEFAULT_MODEL = SUPPORTED_MODELS[0].value;

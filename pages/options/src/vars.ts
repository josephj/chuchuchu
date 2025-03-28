import ISO6391 from 'iso-639-1';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import type { Hat } from './types';
import { OLLAMA_API_ENDPOINT } from '@extension/shared';

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

const getBrowserPreferredLanguage = () => {
  const browserLanguages = navigator.languages || [navigator.language];

  for (const browserLang of browserLanguages) {
    const exactMatch = SUPPORTED_LANGUAGES.find(
      supportedLang => supportedLang.code.toLowerCase() === browserLang.toLowerCase(),
    );
    if (exactMatch) return browserLang;

    const baseLanguage = browserLang.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find(supportedLang => {
      const supportedBase = supportedLang.code.split('-')[0];
      return supportedBase === baseLanguage;
    });
    if (baseMatch) return baseMatch.code;
  }

  return 'en-US';
};

export const DEFAULT_LANGUAGE_CODE = getBrowserPreferredLanguage();

export type CustomModel = {
  value: string;
  label: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'deepseek';
  baseUrl?: string;
  apiKey?: string;
};

// Add storage for custom models
export const customModelsStorage = createStorage<CustomModel[]>('customModels', [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

// Update SUPPORTED_MODELS to be mutable
export const SUPPORTED_MODELS = [
  { value: 'deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 Distill Qwen 32B' },
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill LLaMA 70B' },
  { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B Versatile' },
  { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B Instant' },
  // { value: 'llama3-70b-8192', label: 'LLaMA3 70B (8K context)' },
  // { value: 'llama3-8b-8192', label: 'LLaMA3 8B (8K context)' },
  // { value: 'gemma2-9b-it', label: 'Gemma2 9B Instruct' },
  // { value: 'llama3-mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K context)' },
] as const;

export const DEFAULT_MODEL = SUPPORTED_MODELS[0].value;

// Shared storage instances
export const languageStorage = createStorage<string>('selectedLanguage', DEFAULT_LANGUAGE_CODE, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const openInWebStorage = createStorage<boolean>('openInWeb', true, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const hatsStorage = createStorage<Hat[]>('hats', [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export const selectedHatStorage = createStorage<string>('selectedHat', '', {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

// Add storage for API credentials
export const openAIKeyStorage = createStorage<string>('openAIKey', '', {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export const ollamaBaseUrlStorage = createStorage<string>('ollamaBaseUrl', OLLAMA_API_ENDPOINT, {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export type Mode = 'simple' | 'advanced';
export const DEFAULT_MODE: Mode = 'simple';

export const modeStorage = createStorage<Mode>('mode', DEFAULT_MODE, {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

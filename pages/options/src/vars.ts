import ISO6391 from 'iso-639-1';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
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

export const MODEL_MIGRATION_MAP = {
  'deepseek-r1-distill-qwen-32b': 'qwen-qwq-32b',
} as const;

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
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill LLaMA 70B' },
  { value: 'qwen-qwq-32b', label: 'QWEN QWQ 32B' },
  { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B Versatile' },
  { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B Instant' },
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

export const anthropicApiKeyStorage = createStorage<string>('anthropicApiKey', '', {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export type Mode = 'simple' | 'advanced';
export const DEFAULT_MODE: Mode = 'simple';

export const modeStorage = createStorage<Mode>('mode', DEFAULT_MODE, {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

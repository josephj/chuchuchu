import ISO6391 from 'iso-639-1';

// // Get all ISO-639-1 languages and add custom regional variants
const baseLanguages = ISO6391.getAllCodes().map(code => ({
  code,
  name: `${ISO6391.getNativeName(code)} - ${ISO6391.getName(code)}`,
}));

const regionalVariants = [
  { code: 'zh-TW', name: '繁體中文 (台灣)' },
  { code: 'zh-CN', name: '简体中文 (中国)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-AU', name: 'English (Australia)' },
];

export const SUPPORTED_LANGUAGES = [...regionalVariants, ...baseLanguages].sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_LANGUAGE_CODE = 'en-US';

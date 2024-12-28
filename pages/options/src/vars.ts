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

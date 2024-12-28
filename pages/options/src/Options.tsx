import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { Center, Checkbox, Flex, Text, IconButton, Box, Tooltip } from '@chakra-ui/react';
import { useEffect, useState, useCallback } from 'react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Select from 'react-select';
import type { Theme } from '@chakra-ui/react';
import type { Language } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './vars';

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [openInWeb, setOpenInWeb] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language['code']>(DEFAULT_LANGUAGE_CODE);

  useEffect(() => {
    chrome.storage.local.get('openInWeb').then(result => {
      if (result.openInWeb === false) {
        setOpenInWeb(false);
      } else {
        chrome.storage.local.set({ openInWeb: true });
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get('selectedLanguage').then(result => {
      if (result.selectedLanguage) {
        setSelectedLanguage(result.selectedLanguage);
      } else {
        setSelectedLanguage('zh-TW');
        chrome.storage.local.set({ selectedLanguage: 'zh-TW' });
      }
    });
  }, []);

  const handleOpenInWebChange = (newValue: boolean) => {
    setOpenInWeb(newValue);
    chrome.storage.local.set({ openInWeb: newValue });
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_IN_WEB_CHANGED', value: newValue });
      }
    });
  };

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    chrome.storage.local.set({ selectedLanguage: newLanguage });
  }, []);

  const selectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '200px',
    }),
    container: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 2,
    }),
    option: (base: Record<string, unknown>) => ({
      ...base,
      cursor: 'pointer',
      padding: '8px 12px',
    }),
  };

  const selectTheme = (theme: Theme) =>
    ({
      ...theme,
      colors: {
        ...theme.colors,
        neutral0: isLight ? '#FFFFFF' : '#2D3748', // background
        neutral5: isLight ? '#E2E8F0' : '#4A5568',
        neutral10: isLight ? '#E2E8F0' : '#4A5568',
        neutral20: isLight ? '#E2E8F0' : '#4A5568', // borders
        neutral30: isLight ? '#A0AEC0' : '#718096',
        neutral40: isLight ? '#718096' : '#A0AEC0',
        neutral50: isLight ? '#718096' : '#A0AEC0', // placeholder text
        neutral60: isLight ? '#4A5568' : '#CBD5E0',
        neutral70: isLight ? '#2D3748' : '#E2E8F0',
        neutral80: isLight ? '#1A202C' : '#F7FAFC', // text
        neutral90: isLight ? '#000000' : '#FFFFFF',
        primary: isLight ? '#3182CE' : '#90CDF4', // selected option text
        primary25: isLight ? '#EBF8FF' : '#2A4365', // hovered option
        primary50: isLight ? '#4299E1' : '#2C5282', // active option
        primary75: isLight ? '#2B6CB0' : '#2A4365',
      },
    }) as Theme;

  return (
    <Center>
      <Flex direction="column" gap={4}>
        {/* Language Selector */}
        <Flex gap={2} alignItems="center">
          <Tooltip label="Language" placement="top">
            <Box>
              <Text fontSize="lg">🌐</Text>
            </Box>
          </Tooltip>
          <Select<LanguageOption>
            value={SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)}
            onChange={option => handleLanguageChange(option?.code || DEFAULT_LANGUAGE_CODE)}
            options={SUPPORTED_LANGUAGES}
            styles={selectStyles}
            theme={selectTheme}
            placeholder="Select language..."
            isSearchable
            components={{
              IndicatorSeparator: () => null,
            }}
          />
        </Flex>

        {/* Dark/Light Mode Switch */}
        <Flex justifyContent="center">
          <IconButton
            aria-label="Toggle theme"
            icon={isLight ? <MoonIcon /> : <SunIcon />}
            onClick={exampleThemeStorage.toggle}
            size="sm"
            variant="ghost"
          />
        </Flex>

        {/* Open in Web Toggle */}
        <Flex gap={2} alignItems="center">
          <Text fontWeight="medium">Open links in web:</Text>
          <Checkbox isChecked={openInWeb} onChange={e => handleOpenInWebChange(e.target.checked)} />
        </Flex>
      </Flex>
    </Center>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);

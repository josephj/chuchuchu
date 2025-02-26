import { useColorMode } from '@chakra-ui/react';
import type { Theme } from 'react-select';
import Select from 'react-select';
import { SUPPORTED_LANGUAGES, languageStorage } from '../../../options/src/vars';
import { useStorage } from '@extension/shared';

type Props = {
  isDisabled?: boolean;
  onChange?: (languageCode: string) => void;
};

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

export const LanguageSelector = ({ isDisabled, onChange }: Props) => {
  const selectedLanguage = useStorage(languageStorage);
  const { colorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';

  const handleLanguageChange = (option: LanguageOption | null) => {
    if (option?.code) {
      languageStorage.set(option.code);
      onChange?.(option?.code);
    }
  };

  const customTheme = (theme: Theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: isDarkMode ? '#2D3748' : '#FFFFFF', // background
      neutral5: isDarkMode ? '#4A5568' : '#E2E8F0',
      neutral10: isDarkMode ? '#4A5568' : '#E2E8F0',
      neutral20: isDarkMode ? '#4A5568' : '#E2E8F0', // borders
      neutral30: isDarkMode ? '#718096' : '#A0AEC0',
      neutral40: isDarkMode ? '#A0AEC0' : '#718096',
      neutral50: isDarkMode ? '#A0AEC0' : '#718096', // placeholder text
      neutral60: isDarkMode ? '#CBD5E0' : '#4A5568',
      neutral70: isDarkMode ? '#E2E8F0' : '#2D3748',
      neutral80: isDarkMode ? '#F7FAFC' : '#1A202C', // text
      neutral90: isDarkMode ? '#FFFFFF' : '#000000',
      primary: isDarkMode ? '#90CDF4' : '#3182CE', // selected option text
      primary25: isDarkMode ? '#2A4365' : '#EBF8FF', // hovered option
      primary50: isDarkMode ? '#2C5282' : '#4299E1', // active option
      primary75: isDarkMode ? '#2A4365' : '#2B6CB0',
    },
  });

  const styles = {
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

  return (
    <Select<LanguageOption>
      value={SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)}
      onChange={handleLanguageChange}
      options={SUPPORTED_LANGUAGES}
      isDisabled={isDisabled}
      styles={styles}
      theme={customTheme}
      placeholder="Select language..."
      isSearchable
      components={{
        IndicatorSeparator: () => null,
      }}
    />
  );
};

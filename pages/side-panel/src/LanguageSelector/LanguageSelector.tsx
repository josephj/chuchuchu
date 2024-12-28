import { Box, Flex, Text, Tooltip, useColorMode } from '@chakra-ui/react';
import type { Theme } from 'react-select';
import Select from 'react-select';

import { styles } from './styles';
import type { Language, Option } from './types';
import { SUPPORTED_LANGUAGES } from './vars';

type Props = {
  value?: Language['code'];
  onChange: (value: string) => void;
  isDisabled?: boolean;
};

export const LanguageSelector = ({ value: selectedLanguageCode, onChange, isDisabled }: Props) => {
  const { colorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';
  const options = SUPPORTED_LANGUAGES.map(lang => ({ value: lang.code, label: lang.name }));
  const value = options.find(option => option.value === selectedLanguageCode);

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

  const handleChange = (option: Option | null) => {
    if (option?.value) {
      onChange(option?.value);
    }
  };

  return (
    <Flex gap={2} alignItems="center">
      <Tooltip label="Language" placement="top">
        <Box>
          <Text fontSize="lg">🌐</Text>
        </Box>
      </Tooltip>
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        isDisabled={isDisabled}
        styles={styles}
        theme={customTheme}
        placeholder="Select language..."
        isSearchable
        components={{
          IndicatorSeparator: () => null,
        }}
      />
    </Flex>
  );
};

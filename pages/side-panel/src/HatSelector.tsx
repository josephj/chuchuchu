import type { Theme } from 'react-select';
import { Select, useColorModeValue, Box, Flex, useColorMode } from '@chakra-ui/react';
import type { Hat } from '@extension/storage';
import { FaHatCowboy } from 'react-icons/fa';
import { useHats } from '@extension/shared';

const getLanguageFlag = (code: string): string => {
  // Handle special cases for multi-region languages
  if (code === 'en-US') return '🇺🇸';
  if (code === 'en-AU') return '🇦🇺';
  if (code === 'zh-TW') return '🇹🇼';
  if (code === 'zh-CN') return '🇨🇳';
  if (code === 'zh-HK') return '🇭🇰';
  if (code === 'ko') return '🇰🇷';
  // For standard ISO codes, convert to regional indicator symbols
  const baseCode = code.split('-')[0].toLowerCase();
  if (baseCode.length !== 2) return '';

  // Convert 2-letter code to regional indicator symbols (flag emoji)
  const offset = 127397; // Regional Indicator Symbol "A" minus uppercase "A"
  const flagEmoji = String.fromCodePoint(...[...baseCode].map(c => c.charCodeAt(0) + offset));
  return flagEmoji;
};

type Props = {
  value: string | undefined;
  onChange: (value: string) => void;
  isDisabled?: boolean;
};

type HatOption = {
  value: string;
  label: string;
};

export const HatSelector = ({ value, onChange, isDisabled }: Props) => {
  const hats = useHats();
  const { colorMode } = useColorMode();
  const isDarkMode = colorMode === 'dark';
  const isLight = useColorModeValue(true, false);

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

  const selectStyles = {
    container: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 10,
    }),
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '200px',
    }),
  };

  const options: HatOption[] = hats.map((hat: Hat) => ({
    value: hat.id,
    label: `${getLanguageFlag(hat.language)} ${hat.label}`,
  }));

  return (
    <Flex gap={2} alignItems="center">
      <FaHatCowboy
        size={20}
        style={{
          color: isLight ? 'var(--chakra-colors-gray-600)' : 'var(--chakra-colors-gray-400)',
        }}
      />
      <Box position="relative" zIndex={10}>
        <Select
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Select a hat..."
          size="sm"
          isDisabled={isDisabled}
          minW="150px">
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Box>
    </Flex>
  );
};

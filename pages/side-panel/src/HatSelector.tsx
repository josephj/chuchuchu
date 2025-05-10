import { Select, useColorModeValue, Box, Flex } from '@chakra-ui/react';
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
  const isLight = useColorModeValue(true, false);

  // Sort hats by position
  const sortedHats = [...hats].sort((a, b) => {
    const posA = a.position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.position ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });

  const options: HatOption[] = sortedHats.map((hat: Hat) => {
    const languageFlag = hat.language ? getLanguageFlag(hat.language) : '';
    return {
      value: hat.id,
      label: `${languageFlag} ${hat.label}`,
    };
  });

  return (
    <Flex gap={2} alignItems="center">
      <FaHatCowboy
        size={20}
        style={{
          color: isLight ? 'var(--chakra-colors-gray-600)' : 'var(--chakra-colors-gray-400)',
        }}
      />
      <Box position="relative" zIndex={10}>
        <Select value={value} onChange={e => onChange(e.target.value)} size="sm" isDisabled={isDisabled} minW="150px">
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

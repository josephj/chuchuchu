import Select from 'react-select';
import { useColorModeValue, Box } from '@chakra-ui/react';
import type { Hat } from '../../options/src/types';
import { FaHatCowboy } from 'react-icons/fa';
import { useState, useEffect } from 'react';

type Props = {
  value?: string;
  onChange: (hatId: string) => void;
  isDisabled?: boolean;
};

type HatOption = {
  value: string;
  label: string;
};

export const HatSelector = ({ value, onChange, isDisabled }: Props) => {
  const [hats, setHats] = useState<Hat[]>([]);
  const isLight = useColorModeValue(true, false);

  useEffect(() => {
    chrome.storage.sync.get(['hats'], result => {
      if (result.hats) {
        setHats(result.hats);
      }
    });
  }, []);

  const selectStyles = {
    container: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 10,
    }),
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '200px',
      backgroundColor: isLight
        ? 'var(--chakra-colors-dracula-light-background)'
        : 'var(--chakra-colors-dracula-background)',
      borderColor: isLight
        ? 'var(--chakra-colors-dracula-light-currentLine)'
        : 'var(--chakra-colors-dracula-currentLine)',
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      backgroundColor: isLight ? 'white' : 'var(--chakra-colors-gray-700)',
      zIndex: 11,
    }),
    option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
      ...base,
      backgroundColor: state.isSelected
        ? isLight
          ? 'var(--chakra-colors-blue-500)'
          : 'var(--chakra-colors-blue-200)'
        : state.isFocused
          ? isLight
            ? 'var(--chakra-colors-gray-100)'
            : 'var(--chakra-colors-gray-600)'
          : 'transparent',
      color: state.isSelected ? (isLight ? 'white' : 'black') : isLight ? 'black' : 'white',
      cursor: 'pointer',
    }),
  };

  const options: HatOption[] = hats.map((hat: Hat) => ({
    value: hat.id,
    label: hat.label,
  }));

  return (
    <Box position="relative" zIndex={10}>
      <FaHatCowboy
        size={20}
        style={{
          position: 'absolute',
          left: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isLight ? 'var(--chakra-colors-gray-600)' : 'var(--chakra-colors-gray-400)',
          zIndex: 11,
        }}
      />
      <Select<HatOption>
        value={options.find(option => option.value === value)}
        onChange={option => onChange(option?.value || '')}
        options={options}
        isDisabled={isDisabled}
        styles={{
          ...selectStyles,
          control: (base: Record<string, unknown>) => ({
            ...selectStyles.control(base),
            paddingLeft: '32px', // Make room for the icon
          }),
        }}
        placeholder="Select a hat..."
        noOptionsMessage={() => 'No hats available - create one in Options'}
        isSearchable
      />
    </Box>
  );
};

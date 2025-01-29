import { useStorage } from '@extension/shared';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import Select from 'react-select';
import { useColorModeValue } from '@chakra-ui/react';
import type { Hat } from '../../options/src/types';

type Props = {
  value?: string;
  onChange: (hatId: string) => void;
  isDisabled?: boolean;
};

type HatOption = {
  value: string;
  label: string;
};

const hatsStorage = createStorage<Hat[]>('hats', [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export const HatSelector = ({ value, onChange, isDisabled }: Props) => {
  const hats = useStorage(hatsStorage);
  const isLight = useColorModeValue(true, false);

  const selectStyles = {
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

  const options: HatOption[] = (hats || []).map(hat => ({
    value: hat.id,
    label: hat.label,
  }));

  return (
    <Select<HatOption>
      value={options.find(option => option.value === value)}
      onChange={option => onChange(option?.value || '')}
      options={options}
      isDisabled={isDisabled}
      styles={selectStyles}
      placeholder="Select a hat..."
      noOptionsMessage={() => 'No hats available - create one in Options'}
      isSearchable
    />
  );
};

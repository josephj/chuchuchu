import { Box, Flex, Text, useColorModeValue, IconButton, HStack, Tooltip, ButtonGroup } from '@chakra-ui/react';
import { MoonIcon, SunIcon, SettingsIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { HatSelector } from '../HatSelector';
import { LanguageSelector } from '../LanguageSelector/LanguageSelector';

type Props = {
  mode: 'simple' | 'advanced';
  selectedHat: string;
  colorMode: string;
  isGenerating: boolean;
  onHatChange: (hatId: string) => void;
  onOpenOptions: () => void;
  onOpenOptionsWithRoute: (route: string) => void;
  onToggleColorMode: () => void;
  onLanguageChange: (language: string) => void;
};

export const Nav = ({
  mode,
  selectedHat,
  colorMode,
  isGenerating,
  onHatChange,
  onOpenOptions,
  onOpenOptionsWithRoute,
  onToggleColorMode,
  onLanguageChange,
}: Props) => {
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

  return (
    <Box p={4} borderBottom="1px" borderColor={borderColor}>
      <Flex justify="space-between" align="center">
        <Box px="1">
          {mode === 'simple' ? (
            <HStack>
              <Text fontSize="xl">🌐</Text>
              <LanguageSelector onChange={onLanguageChange} isDisabled={isGenerating} />
            </HStack>
          ) : (
            <ButtonGroup size="sm" variant="ghost" spacing={0} bg={buttonBg} borderRadius="md" p={1}>
              <Box px={1}>
                <HatSelector value={selectedHat} onChange={onHatChange} isDisabled={isGenerating} />
              </Box>
              <Tooltip label="Edit current hat" placement="top" fontSize="xs">
                <IconButton
                  aria-label="Edit current hat"
                  icon={<EditIcon />}
                  onClick={() => onOpenOptionsWithRoute(`/hats/edit/${selectedHat}`)}
                  size="sm"
                  variant="ghost"
                  color={textColor}
                />
              </Tooltip>
              <Tooltip label="Create new hat" placement="top" fontSize="xs">
                <IconButton
                  aria-label="Create new hat"
                  icon={<AddIcon />}
                  onClick={() => onOpenOptionsWithRoute('/hats/add')}
                  size="sm"
                  variant="ghost"
                  color={textColor}
                />
              </Tooltip>
            </ButtonGroup>
          )}
        </Box>

        <Flex gap={2}>
          <IconButton
            aria-label="Open settings"
            icon={<SettingsIcon />}
            onClick={onOpenOptions}
            size="sm"
            variant="ghost"
            color={textColor}
          />
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={onToggleColorMode}
            size="sm"
            variant="ghost"
            color={textColor}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

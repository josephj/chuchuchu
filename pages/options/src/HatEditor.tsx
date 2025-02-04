import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  Grid,
  VStack,
  Box,
  useColorModeValue,
  Slider,
  SliderMark,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import Select from 'react-select';
import type { Theme as ReactSelectTheme } from 'react-select';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, SUPPORTED_MODELS, DEFAULT_MODEL } from './vars';
import type { Hat } from './types';
import { hatSchema } from './types';
import { PromptEditor } from './prompt-editor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingHat: Hat | null;
  onSave: (hat: Hat) => void;
};

const createSelectTheme = (isLight: boolean) => (theme: ReactSelectTheme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    neutral0: isLight ? '#FFFFFF' : '#2D3748',
    neutral5: isLight ? '#E2E8F0' : '#4A5568',
    neutral10: isLight ? '#E2E8F0' : '#4A5568',
    neutral20: isLight ? '#E2E8F0' : '#4A5568',
    neutral30: isLight ? '#A0AEC0' : '#718096',
    neutral40: isLight ? '#718096' : '#A0AEC0',
    neutral50: isLight ? '#718096' : '#A0AEC0',
    neutral60: isLight ? '#4A5568' : '#CBD5E0',
    neutral70: isLight ? '#2D3748' : '#E2E8F0',
    neutral80: isLight ? '#1A202C' : '#F7FAFC',
    neutral90: isLight ? '#000000' : '#FFFFFF',
    primary: isLight ? '#3182CE' : '#90CDF4',
    primary25: isLight ? '#EBF8FF' : '#2A4365',
    primary50: isLight ? '#4299E1' : '#2C5282',
    primary75: isLight ? '#2B6CB0' : '#2A4365',
  },
});

export const HatEditor = ({ isOpen, onClose, editingHat, onSave }: Props) => {
  const location = useLocation();
  const ref = useRef<MDXEditorMethods>(null);
  const [newHat, setNewHat] = useState<Partial<Hat>>({
    temperature: 0,
    language: DEFAULT_LANGUAGE_CODE,
    model: DEFAULT_MODEL,
  });

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const isLight = useColorModeValue(true, false);
  const selectTheme = createSelectTheme(isLight);

  useEffect(() => {
    if (editingHat) {
      if (location.pathname.includes('/hats/clone/')) {
        setNewHat({
          ...editingHat,
          id: `${editingHat.id}-copy`,
          label: `${editingHat.label} (Copy)`,
        });
      } else {
        setNewHat(editingHat);
      }
    } else {
      setNewHat({
        temperature: 0,
        language: DEFAULT_LANGUAGE_CODE,
        model: DEFAULT_MODEL,
      });
    }
  }, [editingHat, location.pathname]);

  const handleSave = async () => {
    try {
      const validatedHat = hatSchema.parse(newHat);
      onSave(validatedHat);
      onClose();
    } catch (error) {
      console.error('Invalid hat data:', error);
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setNewHat(prev => ({
      ...prev,
      label: newLabel,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" portalProps={{ containerRef: null }}>
      <ModalOverlay />
      <ModalContent bg={bg} color={textColor} position="relative">
        <ModalHeader>
          {location.pathname.includes('/hats/clone/') ? 'Clone Hat' : editingHat ? 'Edit Hat' : 'Add New Hat'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Grid templateColumns="350px 1fr" gap={8}>
            {/* Left Column - Settings */}
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Label</FormLabel>
                <Input value={newHat.label || ''} onChange={handleLabelChange} placeholder="Enter hat label" />
              </FormControl>
              <FormControl>
                <FormLabel>ID</FormLabel>
                <Input
                  value={newHat.id || ''}
                  onChange={e => setNewHat({ ...newHat, id: e.target.value })}
                  placeholder="Enter hat ID (English, numbers, dash, and underline only)"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Temperature ({newHat.temperature})</FormLabel>
                <Box pt={2} pb={6} width="90%">
                  <Slider
                    value={newHat.temperature}
                    onChange={value => setNewHat({ ...newHat, temperature: value })}
                    min={0}
                    max={2.5}
                    step={0.1}
                    aria-label="temperature-slider">
                    <SliderMark value={0} mt={4} ml={-2.5} fontSize="xs">
                      Precise
                    </SliderMark>
                    <SliderMark value={1.25} mt={4} ml={-4} fontSize="xs">
                      Balanced
                    </SliderMark>
                    <SliderMark value={2.5} mt={4} ml={-3} fontSize="xs">
                      Creative
                    </SliderMark>
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <Tooltip
                      hasArrow
                      bg={bg}
                      color={textColor}
                      placement="top"
                      label={`Temperature: ${newHat.temperature}`}>
                      <SliderThumb />
                    </Tooltip>
                  </Slider>
                </Box>
              </FormControl>
              <FormControl>
                <FormLabel>Language</FormLabel>
                <Select<LanguageOption>
                  value={SUPPORTED_LANGUAGES.find(lang => lang.code === newHat.language)}
                  onChange={option => setNewHat({ ...newHat, language: option?.code || DEFAULT_LANGUAGE_CODE })}
                  options={SUPPORTED_LANGUAGES}
                  styles={{
                    container: (base: Record<string, unknown>) => ({
                      ...base,
                      zIndex: 20,
                    }),
                    control: (base: Record<string, unknown>) => ({
                      ...base,
                      minHeight: '32px',
                      width: '100%',
                    }),
                    menuPortal: (base: Record<string, unknown>) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  theme={selectTheme}
                  placeholder="Select language..."
                  isSearchable
                  components={{
                    IndicatorSeparator: () => null,
                  }}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Model</FormLabel>
                <Select<ModelOption>
                  value={SUPPORTED_MODELS.find(model => model.value === newHat.model)}
                  onChange={option => setNewHat({ ...newHat, model: option?.value || DEFAULT_MODEL })}
                  options={SUPPORTED_MODELS}
                  styles={{
                    container: (base: Record<string, unknown>) => ({
                      ...base,
                      zIndex: 9,
                    }),
                    control: (base: Record<string, unknown>) => ({
                      ...base,
                      minHeight: '32px',
                      width: '100%',
                    }),
                  }}
                  theme={selectTheme}
                  placeholder="Select model..."
                  isSearchable
                  components={{
                    IndicatorSeparator: () => null,
                  }}
                />
              </FormControl>
              <FormControl>
                <FormLabel>URL Pattern (Optional)</FormLabel>
                <Input
                  value={newHat.urlPattern || ''}
                  onChange={e => setNewHat({ ...newHat, urlPattern: e.target.value })}
                  placeholder="e.g., https://*.example.com/*/page"
                />
              </FormControl>
            </VStack>

            {/* Right Column - Prompt Editor */}
            <PromptEditor value={newHat.prompt || ''} onChange={prompt => setNewHat(prev => ({ ...prev, prompt }))} />
          </Grid>
        </ModalBody>
        <ModalFooter display="flex" width="100%" alignItems="center" gap={3}>
          {editingHat && (
            <Button
              colorScheme="red"
              variant="ghost"
              onClick={() => {
                onSave(editingHat);
                onClose();
              }}
              leftIcon={<DeleteIcon />}>
              Delete
            </Button>
          )}
          <Box flex={1} />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            {editingHat ? 'Update Hat' : 'Add Hat'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

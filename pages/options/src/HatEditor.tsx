import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Flex,
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
  Alert,
  AlertIcon,
  AlertDescription,
  IconButton,
  FormHelperText,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';
import Select, { components } from 'react-select';
import type { Theme as ReactSelectTheme } from 'react-select';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  customModelsStorage,
  type CustomModel,
} from './vars';
import type { Hat } from './types';
import { hatSchema } from './types';
import { PromptEditor } from './prompt-editor';
import { ModelSelector } from './ModelSelector';
import { nanoid } from 'nanoid';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingHat: Hat | null;
  onSave: (hat: Hat) => void;
  allHats: Hat[];
};

type ModelOption = {
  value: string;
  label: string;
};

type LanguageOption = {
  code: string;
  name: string;
};

type OptionProps = {
  children: React.ReactNode;
  value: string;
} & Record<string, unknown>;

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

const generateHatId = (label: string) => {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  const uniqueSuffix = nanoid(8);
  return ['hat', slug, uniqueSuffix].filter(Boolean).join('_');
};

const isCustomModel = (modelValue: string) => {
  return !SUPPORTED_MODELS.some(model => model.value === modelValue);
};

export const HatEditor = ({ isOpen, onClose, editingHat, onSave, allHats }: Props) => {
  const location = useLocation();
  const [newHat, setNewHat] = useState<Partial<Hat>>({
    id: generateHatId('new-hat'),
    temperature: 0,
    language: DEFAULT_LANGUAGE_CODE,
    model: DEFAULT_MODEL,
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const isLight = useColorModeValue(true, false);
  const selectTheme = createSelectTheme(isLight);

  useEffect(() => {
    if (editingHat) {
      if (location.pathname.includes('/hats/clone/')) {
        setNewHat({
          ...editingHat,
          id: generateHatId(editingHat.label),
          alias: `${editingHat.alias || editingHat.label}-copy`,
          label: `${editingHat.label} (Copy)`,
        });
      } else {
        setNewHat(editingHat);
      }
    } else {
      setNewHat({
        id: generateHatId('new-hat'),
        temperature: 0,
        language: DEFAULT_LANGUAGE_CODE,
        model: DEFAULT_MODEL,
      });
    }
  }, [editingHat, location.pathname]);

  // Load custom models on mount
  useEffect(() => {
    customModelsStorage.get().then(setCustomModels);
  }, []);

  // Subscribe to custom models changes
  useEffect(() => {
    const unsubscribe = customModelsStorage.subscribe(() => {
      customModelsStorage.get().then(setCustomModels);
    });
    return () => unsubscribe();
  }, []);

  // Combine built-in and custom models for the select
  const allModels = useMemo(() => [...SUPPORTED_MODELS, ...(customModels || [])], [customModels]);

  const handleSave = async () => {
    try {
      setError(null);
      const validatedHat = hatSchema.parse(newHat);

      // Check individual hat size
      const hatSize = new Blob([JSON.stringify(validatedHat)]).size;
      console.log('[HatEditor] Hat size:', hatSize);

      if (hatSize > 8192) {
        // Chrome's QUOTA_BYTES_PER_ITEM is 8192 bytes
        setError('Hat data is too large. Please reduce the prompt size or remove some content.');
        return;
      }

      onSave(validatedHat);
      onClose();
    } catch (error) {
      console.error('Invalid hat data:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while saving the hat.');
      }
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setNewHat(prev => ({
      ...prev,
      label: newLabel,
    }));
  };

  const handleAddModel = (modelName: string) => {
    const newModel = {
      value: `ollama/${modelName}`,
      label: `Ollama: ${modelName}`,
    };

    // Update custom models instead of SUPPORTED_MODELS
    setCustomModels(prev => [...prev, newModel]);

    // Update the current hat's model
    setNewHat(prev => ({
      ...prev,
      model: newModel.value,
    }));
  };

  const handleRemoveModel = async (modelValue: string) => {
    // Only allow removing custom models
    if (!isCustomModel(modelValue)) {
      return;
    }

    // Remove from custom models storage
    const updatedModels = customModels.filter(model => model.value !== modelValue);
    await customModelsStorage.set(updatedModels);

    // If the current hat uses this model, reset to default
    if (newHat.model === modelValue) {
      setNewHat(prev => ({
        ...prev,
        model: DEFAULT_MODEL,
      }));
    }
  };

  const isModelInUse = (modelValue: string) => allHats.some(hat => hat.model === modelValue);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" portalProps={{ containerRef: undefined }}>
      <ModalOverlay />
      <ModalContent bg={bg} color={textColor} mx={10} position="relative">
        <ModalHeader>
          {location.pathname.includes('/hats/clone/') ? 'Clone Hat' : editingHat ? 'Edit Hat' : 'Add New Hat'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {error ? (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Grid templateColumns="350px 1fr" gap={8}>
            {/* Left Column - Settings */}
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Label</FormLabel>
                <Input value={newHat.label || ''} onChange={handleLabelChange} placeholder="Enter hat label" />
                <FormHelperText fontSize="xs">A unique name to identify this hat</FormHelperText>
              </FormControl>
              <FormControl isRequired>
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
                <FormHelperText fontSize="xs">
                  Controls response creativity - lower values for factual responses, higher for more creative ones
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Language</FormLabel>
                <Select<LanguageOption>
                  value={SUPPORTED_LANGUAGES.find(lang => lang.code === newHat.language) || null}
                  onChange={option => setNewHat(prev => ({ ...prev, language: option?.code || '' }))}
                  options={SUPPORTED_LANGUAGES}
                  isClearable
                  placeholder="(Use default)"
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
                  isSearchable
                  components={{
                    IndicatorSeparator: () => null,
                  }}
                />
                <FormHelperText fontSize="xs">
                  Choose a specific language for responses, or leave empty to use the default
                </FormHelperText>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Model</FormLabel>
                <Flex align="stretch" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Select<ModelOption>
                      value={allModels.find(model => model.value === newHat.model)}
                      onChange={option => setNewHat({ ...newHat, model: option?.value || DEFAULT_MODEL })}
                      options={allModels}
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
                        Option: ({ children, ...props }: OptionProps) => (
                          <Box position="relative">
                            <components.Option {...props}>
                              {children}
                              {isCustomModel(props.value) && (
                                <Tooltip
                                  hasArrow
                                  label={
                                    isModelInUse(props.value) ? "Can't remove model while it's in use" : 'Remove model'
                                  }>
                                  <Box display="inline-block">
                                    <IconButton
                                      aria-label="Remove model"
                                      icon={<DeleteIcon />}
                                      size="xs"
                                      position="absolute"
                                      right={2}
                                      top="50%"
                                      transform="translateY(-50%)"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleRemoveModel(props.value);
                                      }}
                                      isDisabled={isModelInUse(props.value)}
                                    />
                                  </Box>
                                </Tooltip>
                              )}
                            </components.Option>
                          </Box>
                        ),
                      }}
                    />
                  </Box>
                  <Button size="sm" onClick={() => setIsModelSelectorOpen(true)}>
                    <AddIcon />
                  </Button>
                </Flex>
                <FormHelperText fontSize="xs">Select the AI model to use for this hat</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>URL Pattern</FormLabel>
                <Input
                  value={newHat.urlPattern || ''}
                  onChange={e => setNewHat({ ...newHat, urlPattern: e.target.value })}
                  placeholder="e.g., https://*.example.com/*/page"
                />
                <FormHelperText fontSize="xs">
                  When specified, this hat will automatically activate on matching URLs. Use * for wildcards
                </FormHelperText>
              </FormControl>
            </VStack>

            {/* Right Column - Prompt Editor */}
            <Box>
              <PromptEditor value={newHat.prompt || ''} onChange={prompt => setNewHat(prev => ({ ...prev, prompt }))} />
            </Box>
          </Grid>
        </ModalBody>
        <ModalFooter display="flex" width="100%" alignItems="center" gap={3}>
          {editingHat && !location.pathname.includes('/hats/clone/') && (
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
            {location.pathname.includes('/hats/clone/') ? 'Add Hat' : editingHat ? 'Update Hat' : 'Add Hat'}
          </Button>
        </ModalFooter>
      </ModalContent>

      {/* Add ModelSelector */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        onSelect={handleAddModel}
      />
    </Modal>
  );
};

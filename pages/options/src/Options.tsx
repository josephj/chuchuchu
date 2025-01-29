import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { theme } from '../../side-panel/src/theme';
import {
  Center,
  Switch,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  FormHelperText,
  Icon,
  Heading,
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  ChakraProvider,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  Textarea,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Tooltip,
  VStack,
  Text,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { CheckIcon, AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme as ReactSelectTheme } from 'react-select';
import type { OptionsFormData, Hat } from './types';
import { optionsFormSchema, hatSchema } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, SUPPORTED_MODELS, DEFAULT_MODEL } from './vars';

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

const languageStorage = createStorage<string>('selectedLanguage', DEFAULT_LANGUAGE_CODE, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const openInWebStorage = createStorage<boolean>('openInWeb', true, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const hatsStorage = createStorage<Hat[]>('hats', [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const selectedLanguage = useStorage(languageStorage);
  const openInWeb = useStorage(openInWebStorage);
  const hats = useStorage(hatsStorage);
  const isLight = theme === 'light';
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHat, setNewHat] = useState<Partial<Hat>>({
    temperature: 0,
    language: selectedLanguage,
    model: DEFAULT_MODEL,
  });
  const [editingHat, setEditingHat] = useState<Hat | null>(null);
  const [hatToDelete, setHatToDelete] = useState<Hat | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  // Add Dracula theme colors
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  useEffect(() => {
    // Clear saved indicators after 2 seconds
    const timer = setTimeout(() => {
      setSavedSettings({});
    }, 2000);
    return () => clearTimeout(timer);
  }, [savedSettings]);

  const { control, setValue, handleSubmit } = useForm<OptionsFormData>({
    resolver: zodResolver(optionsFormSchema),
    defaultValues: {
      language: DEFAULT_LANGUAGE_CODE,
      theme: !isLight,
      openInWeb: true,
    },
  });

  useEffect(() => {
    setValue('language', selectedLanguage);
    setValue('openInWeb', openInWeb);
  }, [setValue, selectedLanguage, openInWeb]);

  const onSubmit = async (data: OptionsFormData) => {
    // Handle theme change
    if (data.theme !== !isLight) {
      exampleThemeStorage.toggle();
      setSavedSettings(prev => ({ ...prev, theme: true }));
    }

    // Handle language change
    if (data.language !== selectedLanguage) {
      await languageStorage.set(data.language);
      setSavedSettings(prev => ({ ...prev, language: true }));
    }

    // Handle openInWeb change
    if (data.openInWeb !== openInWeb) {
      await openInWebStorage.set(data.openInWeb);
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_IN_WEB_CHANGED', value: data.openInWeb });
        }
      });
      setSavedSettings(prev => ({ ...prev, openInWeb: true }));
    }
  };

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

  const selectTheme = (theme: ReactSelectTheme) => ({
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

  const handleDeleteClick = (hat: Hat) => {
    setHatToDelete(hat);
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setHatToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (hatToDelete) {
      const updatedHats = (hats || []).filter(hat => hat.id !== hatToDelete.id);
      await hatsStorage.set(updatedHats);
      closeDeleteAlert();
    }
  };

  const handleEditHat = (hat: Hat) => {
    setEditingHat(hat);
    setNewHat(hat);
    setIsModalOpen(true);
  };

  const handleAddOrUpdateHat = async () => {
    try {
      const validatedHat = hatSchema.parse(newHat);
      let updatedHats: Hat[];

      if (editingHat) {
        // Update existing hat
        updatedHats = (hats || []).map(hat => (hat.id === editingHat.id ? validatedHat : hat));
      } else {
        // Add new hat
        updatedHats = [...(hats || []), validatedHat];
      }

      await hatsStorage.set(updatedHats);
      setIsModalOpen(false);
      setEditingHat(null);
      setNewHat({
        temperature: 0,
        language: selectedLanguage,
        model: DEFAULT_MODEL,
      });
    } catch (error) {
      console.error('Invalid hat data:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHat(null);
    setNewHat({
      temperature: 0,
      language: selectedLanguage,
      model: DEFAULT_MODEL,
    });
  };

  const generateIdFromLabel = (label: string): string => {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-\s]/g, '') // Remove special characters except hyphen
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setNewHat(prev => ({
      ...prev,
      label: newLabel,
      // Only update ID if it hasn't been manually edited or is empty
      id: prev.id === generateIdFromLabel(prev.label || '') || !prev.id ? generateIdFromLabel(newLabel) : prev.id,
    }));
  };

  return (
    <Center p={6} bg={bg} minH="100vh" color={textColor}>
      <form onChange={handleSubmit(onSubmit)} style={{ width: '100%', maxWidth: '800px' }}>
        <Accordion defaultIndex={[0, 1, 2]} allowMultiple>
          {/* General Settings */}
          <AccordionItem borderColor={borderColor}>
            <h2>
              <AccordionButton _hover={{ bg: buttonBg }}>
                <Box as="span" flex="1" textAlign="left">
                  <Heading size="md">General Settings</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Grid templateColumns="200px 1fr" gap={6} alignItems="start" w="full">
                {/* Language Setting */}
                <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                  <FormLabel fontWeight="medium" m={0} htmlFor="language-select" color={textColor}>
                    Language
                  </FormLabel>
                </GridItem>
                <GridItem display="flex" alignItems="center" gap={2}>
                  <FormControl id="language-select">
                    <Controller
                      control={control}
                      name="language"
                      render={({ field: { onChange, value } }) => (
                        <Select<LanguageOption>
                          value={SUPPORTED_LANGUAGES.find(lang => lang.code === value)}
                          onChange={option => onChange(option?.code || DEFAULT_LANGUAGE_CODE)}
                          options={SUPPORTED_LANGUAGES}
                          styles={{
                            ...selectStyles,
                            control: (base: Record<string, unknown>) => ({
                              ...base,
                              minHeight: '32px',
                              width: '200px',
                              backgroundColor: theme === 'light' ? 'dracula.light.background' : 'dracula.background',
                              borderColor: theme === 'light' ? 'dracula.light.currentLine' : 'dracula.currentLine',
                            }),
                          }}
                          theme={selectTheme}
                          placeholder="Select language..."
                          isSearchable
                          components={{
                            IndicatorSeparator: () => null,
                          }}
                        />
                      )}
                    />
                    <FormHelperText color={textColorSecondary}>
                      Choose your preferred language for the extension
                    </FormHelperText>
                  </FormControl>
                  {savedSettings.language && <Icon as={CheckIcon} color="green.500" />}
                </GridItem>

                {/* Theme Setting */}
                <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                  <FormLabel fontWeight="medium" m={0} htmlFor="theme-toggle" color={textColor}>
                    Theme
                  </FormLabel>
                </GridItem>
                <GridItem display="flex" alignItems="center" gap={2}>
                  <FormControl id="theme-toggle">
                    <Controller
                      control={control}
                      name="theme"
                      render={({ field: { onChange, value } }) => (
                        <Switch isChecked={value} onChange={onChange} size="lg" />
                      )}
                    />
                    <FormHelperText color={textColorSecondary}>Switch between light and dark mode</FormHelperText>
                  </FormControl>
                  {savedSettings.theme && <Icon as={CheckIcon} color="green.500" />}
                </GridItem>
              </Grid>
            </AccordionPanel>
          </AccordionItem>

          {/* Slack Settings */}
          <AccordionItem borderColor={borderColor}>
            <h2>
              <AccordionButton _hover={{ bg: buttonBg }}>
                <Box as="span" flex="1" textAlign="left">
                  <Heading size="md">Slack Settings</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Grid templateColumns="200px 1fr" gap={6} alignItems="start" w="full">
                {/* Open in Web Setting */}
                <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                  <FormLabel fontWeight="medium" m={0} htmlFor="open-in-web" color={textColor}>
                    Open in Web
                  </FormLabel>
                </GridItem>
                <GridItem display="flex" alignItems="center" gap={2}>
                  <FormControl id="open-in-web">
                    <Controller
                      control={control}
                      name="openInWeb"
                      render={({ field: { onChange, value } }) => (
                        <Switch isChecked={value} onChange={onChange} size="lg" />
                      )}
                    />
                    <FormHelperText color={textColorSecondary}>
                      Choose whether to open links in web browser
                    </FormHelperText>
                  </FormControl>
                  {savedSettings.openInWeb && <Icon as={CheckIcon} color="green.500" />}
                </GridItem>
              </Grid>
            </AccordionPanel>
          </AccordionItem>

          {/* Hats Settings */}
          <AccordionItem borderColor={borderColor}>
            <h2>
              <AccordionButton _hover={{ bg: buttonBg }}>
                <Box as="span" flex="1" textAlign="left">
                  <Heading size="md">Hats</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack spacing={4} align="stretch">
                {!hats || hats.length === 0 ? (
                  <Text color={textColorSecondary}>No hats added yet</Text>
                ) : (
                  hats.map(hat => (
                    <Box
                      key={hat.id}
                      p={4}
                      borderWidth="1px"
                      borderRadius="md"
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      position="relative"
                      role="group"
                      onClick={() => handleEditHat(hat)}
                      _hover={{
                        borderColor: 'blue.500',
                        cursor: 'pointer',
                        bg: hoverBg,
                      }}
                      transition="all 0.2s">
                      <Box>
                        <Text fontWeight="bold">{hat.label}</Text>
                        <Text fontSize="sm" color={textColorSecondary}>
                          ID: {hat.id}
                        </Text>
                      </Box>
                      <Box
                        opacity={0}
                        _groupHover={{
                          opacity: 1,
                        }}
                        transition="opacity 0.2s"
                        display="flex"
                        position="absolute"
                        right={4}
                        onClick={e => e.stopPropagation()}>
                        <IconButton
                          aria-label="Edit hat"
                          icon={<EditIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          mr={2}
                          onClick={e => {
                            e.stopPropagation();
                            handleEditHat(hat);
                          }}
                        />
                        <IconButton
                          aria-label="Delete hat"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteClick(hat);
                          }}
                        />
                      </Box>
                    </Box>
                  ))
                )}
                <Button
                  leftIcon={<AddIcon />}
                  onClick={() => {
                    setEditingHat(null);
                    setNewHat({
                      temperature: 0,
                      language: selectedLanguage,
                      model: DEFAULT_MODEL,
                    });
                    setIsModalOpen(true);
                  }}
                  colorScheme="blue"
                  variant="outline">
                  Add new hat
                </Button>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </form>

      {/* Add/Edit Hat Modal */}
      <Modal isOpen={isModalOpen} onClose={handleModalClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={bg} color={textColor}>
          <ModalHeader>{editingHat ? 'Edit Hat' : 'Add New Hat'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
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
                <FormHelperText color={textColorSecondary}>
                  Auto-generated from label, but can be manually edited
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Prompt</FormLabel>
                <Textarea
                  value={newHat.prompt || ''}
                  onChange={e => setNewHat({ ...newHat, prompt: e.target.value })}
                  placeholder="Enter your prompt in Markdown format"
                  minH="200px"
                  size="md"
                  resize="vertical"
                />
                <FormHelperText color={textColorSecondary}>
                  Write your prompt in Markdown format. You can use variables like {'{text}'} for the content to
                  summarize
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Temperature ({newHat.temperature})</FormLabel>
                <Box pt={2} pb={6} display="flex" justifyContent="center">
                  <Slider
                    value={newHat.temperature}
                    onChange={value => setNewHat({ ...newHat, temperature: value })}
                    min={0}
                    max={2.5}
                    step={0.1}
                    aria-label="temperature-slider"
                    width="80%">
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
                <FormHelperText color={textColorSecondary} fontSize="xs">
                  Lower values produce more focused and deterministic outputs, while higher values increase creativity
                  and randomness
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Language</FormLabel>
                <Select
                  value={SUPPORTED_LANGUAGES.find(lang => lang.code === newHat.language)}
                  onChange={option => setNewHat({ ...newHat, language: option?.code || DEFAULT_LANGUAGE_CODE })}
                  options={SUPPORTED_LANGUAGES}
                  styles={selectStyles}
                  theme={selectTheme}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Model</FormLabel>
                <Select
                  value={SUPPORTED_MODELS.find(model => model.value === newHat.model)}
                  onChange={option => setNewHat({ ...newHat, model: option?.value || DEFAULT_MODEL })}
                  options={SUPPORTED_MODELS}
                  styles={selectStyles}
                  theme={selectTheme}
                  placeholder="Select model..."
                />
                <FormHelperText color={textColorSecondary}>Choose the GROQ model for this hat</FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter display="flex" width="100%" alignItems="center" gap={3}>
            {editingHat && (
              <Button
                colorScheme="red"
                variant="ghost"
                onClick={() => {
                  handleDeleteClick(editingHat);
                  handleModalClose();
                }}
                leftIcon={<DeleteIcon />}>
                Delete
              </Button>
            )}
            <Box flex={1} />
            <Button variant="ghost" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddOrUpdateHat}>
              {editingHat ? 'Update Hat' : 'Add Hat'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelDeleteRef} onClose={closeDeleteAlert}>
        <AlertDialogOverlay>
          <AlertDialogContent bg={bg} color={textColor}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Hat
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete &ldquo;{hatToDelete?.label}&rdquo;? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={closeDeleteAlert} variant="ghost" mr={3}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} fontWeight="bold">
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Center>
  );
};

export default withErrorBoundary(
  withSuspense(
    () => (
      <ChakraProvider theme={theme}>
        <Options />
      </ChakraProvider>
    ),
    <div> Loading ... </div>,
  ),
  <div> Error Occur </div>,
);

import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { theme } from '../../side-panel/src/theme';
import {
  Center,
  Switch,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  Icon,
  Heading,
  HStack,
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
import { CheckIcon, AddIcon, DeleteIcon, EditIcon, CopyIcon } from '@chakra-ui/icons';
import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme as ReactSelectTheme } from 'react-select';
import type { OptionsFormData, Hat } from './types';
import { optionsFormSchema, hatSchema } from './types';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  languageStorage,
  openInWebStorage,
  hatsStorage,
} from './vars';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

type ModelOption = {
  value: string;
  label: string;
};

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

const HatModal = ({
  isOpen,
  onClose,
  editingHat,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingHat: Hat | null;
  onSave: (hat: Hat) => void;
}) => {
  const location = useLocation();
  const [newHat, setNewHat] = useState<Partial<Hat>>({
    temperature: 0,
    language: DEFAULT_LANGUAGE_CODE,
    model: DEFAULT_MODEL,
  });
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const isLight = useColorModeValue(true, false);

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

  const languageSelectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '100%',
    }),
    container: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 3,
    }),
    option: (base: Record<string, unknown>) => ({
      ...base,
      cursor: 'pointer',
      padding: '8px 12px',
    }),
  };

  const modelSelectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '100%',
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

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setNewHat(prev => ({
      ...prev,
      label: newLabel,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent bg={bg} color={textColor}>
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
                      zIndex: 10,
                    }),
                    control: (base: Record<string, unknown>) => ({
                      ...base,
                      minHeight: '32px',
                      width: '100%',
                    }),
                  }}
                  theme={theme => ({
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
                  })}
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
                  theme={theme => ({
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
                  })}
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
            <Box>
              <FormControl height="100%">
                <FormLabel>Prompt</FormLabel>
                <Textarea
                  value={newHat.prompt || ''}
                  onChange={e => setNewHat({ ...newHat, prompt: e.target.value })}
                  placeholder="Enter your prompt in Markdown format"
                  minH="500px"
                  size="md"
                  resize="vertical"
                  fontFamily="mono"
                />
              </FormControl>
            </Box>
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

const Options = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hatId } = useParams();
  const theme = useStorage(exampleThemeStorage);
  const selectedLanguage = useStorage(languageStorage);
  const openInWeb = useStorage(openInWebStorage);
  const hats = useStorage(hatsStorage);
  const isLight = theme === 'light';
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const [hatToDelete, setHatToDelete] = useState<Hat | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const { control, setValue, handleSubmit } = useForm<OptionsFormData>({
    resolver: zodResolver(optionsFormSchema),
    defaultValues: {
      language: DEFAULT_LANGUAGE_CODE,
      theme: !isLight,
      openInWeb: true,
    },
  });

  const editingHat = hatId ? hats?.find(hat => hat.id === hatId) || null : null;
  const isModalOpen =
    location.pathname.includes('/hats/add') ||
    location.pathname.includes('/hats/edit/') ||
    location.pathname.includes('/hats/clone/');

  useEffect(() => {
    // Clear saved indicators after 2 seconds
    const timer = setTimeout(() => {
      setSavedSettings({});
    }, 2000);
    return () => clearTimeout(timer);
  }, [savedSettings]);

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

  const languageSelectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '100%',
    }),
    container: (base: Record<string, unknown>) => ({
      ...base,
      zIndex: 3,
    }),
    option: (base: Record<string, unknown>) => ({
      ...base,
      cursor: 'pointer',
      padding: '8px 12px',
    }),
  };

  const modelSelectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      minHeight: '32px',
      width: '100%',
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
      navigate('/');
    }
  };

  const handleAddOrUpdateHat = async (hat: Hat) => {
    try {
      let updatedHats: Hat[];

      if (location.pathname.includes('/hats/edit/')) {
        // Update existing hat
        updatedHats = (hats || []).map(h => (h.id === hat.id ? hat : h));
      } else if (location.pathname.includes('/hats/clone/')) {
        // Clone hat with new ID
        updatedHats = [...(hats || []), { ...hat, id: `${hat.id}-copy`, label: `${hat.label} (Copy)` }];
      } else {
        // Add new hat
        updatedHats = [...(hats || []), hat];
      }

      await hatsStorage.set(updatedHats);
      navigate('/');
    } catch (error) {
      console.error('Invalid hat data:', error);
    }
  };

  const handleModalClose = () => {
    navigate('/');
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
                            container: (base: Record<string, unknown>) => ({
                              ...base,
                              zIndex: 10,
                            }),
                            control: (base: Record<string, unknown>) => ({
                              ...base,
                              minHeight: '32px',
                              width: '100%',
                            }),
                          }}
                          theme={theme => ({
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
                          })}
                          placeholder="Select language..."
                          isSearchable
                          components={{
                            IndicatorSeparator: () => null,
                          }}
                        />
                      )}
                    />
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
                      onClick={() => navigate(`hats/edit/${hat.id}`)}
                      _hover={{
                        borderColor: 'blue.500',
                        cursor: 'pointer',
                        bg: hoverBg,
                      }}
                      transition="all 0.2s">
                      <HStack>
                        <Text color={textColorSecondary} fontSize="md">
                          {getLanguageFlag(hat.language)}
                        </Text>
                        <Text fontWeight="bold">{hat.label}</Text>
                        <Text as="span" color={textColorSecondary} fontWeight="normal">
                          ({hat.id})
                        </Text>
                        {hat.urlPattern && (
                          <Text fontSize="xs" color={textColorSecondary}>
                            {hat.urlPattern}
                          </Text>
                        )}
                      </HStack>
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
                          aria-label="Clone hat"
                          icon={<CopyIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="green"
                          mr={2}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`hats/clone/${hat.id}`);
                          }}
                        />
                        <IconButton
                          aria-label="Edit hat"
                          icon={<EditIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          mr={2}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`hats/edit/${hat.id}`);
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
                  onClick={() => navigate('hats/add')}
                  colorScheme="blue"
                  variant="outline">
                  Add new hat
                </Button>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </form>

      {/* Hat Modal */}
      <HatModal isOpen={isModalOpen} onClose={handleModalClose} editingHat={editingHat} onSave={handleAddOrUpdateHat} />

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

const OptionsWithRouter = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Options />}>
        <Route path="hats/add" element={<Options />} />
        <Route path="hats/edit/:hatId" element={<Options />} />
        <Route path="hats/clone/:hatId" element={<Options />} />
      </Route>
    </Routes>
  </HashRouter>
);

export default withErrorBoundary(
  withSuspense(
    () => (
      <ChakraProvider theme={theme}>
        <OptionsWithRouter />
      </ChakraProvider>
    ),
    <div> Loading ... </div>,
  ),
  <div> Error Occur </div>,
);

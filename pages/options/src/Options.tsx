import { useRef, useEffect, useState } from 'react';
import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import {
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
  Button,
  VStack,
  Text,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useColorMode,
  FormHelperText,
  Tooltip,
  ButtonGroup,
  useToast,
  type ExpandedIndex,
} from '@chakra-ui/react';
import {
  CheckIcon,
  AddIcon,
  DeleteIcon,
  EditIcon,
  CopyIcon,
  InfoIcon,
  RepeatIcon,
  DragHandleIcon,
} from '@chakra-ui/icons';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OptionsFormData, Hat } from './types';
import { optionsFormSchema } from './types';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  languageStorage,
  openInWebStorage,
  modeStorage,
  DEFAULT_MODE,
  selectedHatStorage,
} from './vars';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import type { Theme as ReactSelectTheme } from 'react-select';
import { HatEditor } from './HatEditor';
import { hatStorage } from '@extension/storage';
import { runModelMigration } from './utils/model-migration';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';

type LanguageOption = {
  value: string;
  label: string;
  code: string;
  name: string;
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

const Options = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hatId } = useParams();
  const selectedLanguage = useStorage(languageStorage);
  const openInWeb = useStorage(openInWebStorage);
  const mode = useStorage(modeStorage);
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const [hatToDelete, setHatToDelete] = useState<Hat | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<number[]>([0, 1]);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const [hats, setHats] = useState<Hat[]>([]);
  const { colorMode } = useColorMode();
  const isLight = colorMode === 'light';
  const toast = useToast();

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const { control, setValue, handleSubmit } = useForm<OptionsFormData>({
    resolver: zodResolver(optionsFormSchema),
    mode: 'onChange',
    defaultValues: {
      language: DEFAULT_LANGUAGE_CODE,
      theme: !isLight,
      openInWeb: true,
      mode: DEFAULT_MODE,
    },
  });

  const editingHat = hatId ? hats?.find(hat => hat.id === hatId) || null : null;
  const isModalOpen =
    location.pathname.includes('/hats/add') ||
    location.pathname.includes('/hats/edit/') ||
    location.pathname.includes('/hats/clone/');

  const selectTheme = createSelectTheme(isLight);

  const [searchParams] = useSearchParams();
  const isFromSidePanel = searchParams.get('via') === 'side-panel';

  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);

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
    setValue('mode', mode);
    setExpandedPanels(mode === 'advanced' ? [0, 1, 2] : [0, 1]);
  }, [setValue, selectedLanguage, openInWeb, mode]);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.selectedLanguage?.newValue) {
        setValue('language', changes.selectedLanguage.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [setValue]);

  const handleSave = async (data: OptionsFormData) => {
    // Handle language change
    console.log('[Options] onSubmit', data);
    if (data.language !== selectedLanguage) {
      await languageStorage.set(data.language);
      setSavedSettings(prev => ({ ...prev, language: true }));
    }

    // Handle openInWeb change
    if (data.openInWeb !== openInWeb) {
      await openInWebStorage.set(data.openInWeb);
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'OPEN_IN_WEB_CHANGED', value: data.openInWeb });
          }
        });
      });
      setSavedSettings(prev => ({ ...prev, openInWeb: true }));
    }

    // Handle mode change
    if (data.mode !== mode) {
      await modeStorage.set(data.mode);
      setSavedSettings(prev => ({ ...prev, mode: true }));
    }
  };

  const handleDeleteClick = (hat: Hat) => {
    setHatToDelete(hat);
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setHatToDelete(null);
  };

  const closeOptionsTab = () => {
    if (isFromSidePanel) {
      chrome.tabs.getCurrent(tab => {
        if (tab?.id) {
          chrome.tabs.remove(tab.id);
        }
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (hatToDelete) {
      try {
        // Check if this is the last hat
        if (hats.length <= 1) {
          throw new Error("Can't delete the last hat. At least one hat must remain.");
        }

        await hatStorage.deleteHat(hatToDelete.id);

        // Update local state
        await loadHats();

        closeDeleteAlert();
        navigate('/');

        // Show success toast
        toast({
          title: 'Hat deleted',
          description: `Successfully deleted "${hatToDelete.label}"`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Close the tab if coming from side panel
        if (isFromSidePanel) {
          closeOptionsTab();
        }
      } catch (error) {
        // Show error toast
        toast({
          title: 'Error deleting hat',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        closeDeleteAlert();
      }
    }
  };

  const handleSaveHat = async (hat: Hat) => {
    try {
      if (location.pathname.includes('/hats/edit/')) {
        await hatStorage.setHat(hat);
      } else {
        await hatStorage.addHat(hat);
      }

      // Show success toast
      toast({
        title: location.pathname.includes('/hats/edit/') ? 'Hat updated' : 'Hat created',
        description: `Successfully ${location.pathname.includes('/hats/edit/') ? 'updated' : 'created'} "${hat.label}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refresh the UI
      await loadHats();
      navigate('/');

      // Close the tab if coming from side panel
      if (isFromSidePanel) {
        closeOptionsTab();
      }
    } catch (error) {
      console.error('Failed to save hat:', error);
      toast({
        title: 'Error saving hat',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const loadHats = async () => {
    const list = await hatStorage.getHatList();
    const fullHats = await Promise.all(list.map(item => hatStorage.getHat(item.id)));
    const filteredHats = fullHats.filter((hat): hat is Hat => hat !== null);
    // Sort hats by position
    const sortedHats = filteredHats.sort((a, b) => {
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
    setHats(sortedHats);
  };

  useEffect(() => {
    const initializeHats = async () => {
      try {
        await loadHats();
      } catch (error) {
        console.error('Error initializing hats:', error);
        toast({
          title: 'Error loading hats',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    initializeHats();
  }, []);

  const handleModalClose = () => {
    navigate('/');
    if (isFromSidePanel) {
      closeOptionsTab();
    }
  };

  const isAdvancedMode = mode === 'advanced';

  const handleResetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResetAlertOpen(true);
  };

  const handleResetConfirm = async () => {
    try {
      await hatStorage.reset();
      // Reset selected hat to empty string to trigger a refresh
      await selectedHatStorage.set('');
      // Load hats to refresh the list
      await loadHats();
      toast({
        title: 'Hats Reset',
        description: 'Successfully restored default hats',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error resetting hats',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResetAlertOpen(false);
    }
  };

  const handleAccordionChange = (expandedIndex: ExpandedIndex) => {
    setExpandedPanels(Array.isArray(expandedIndex) ? expandedIndex : [expandedIndex]);
  };

  useEffect(() => {
    const checkAndMigrateModels = async () => {
      const hasChanges = await runModelMigration();
      if (hasChanges) {
        toast({
          title: 'Model Update',
          description: 'Some AI models have been updated to newer versions to ensure continued functionality.',
          status: 'info',
          duration: 9000,
          isClosable: true,
        });
      }
    };

    checkAndMigrateModels();
  }, [toast]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(hats);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));

    // Update storage
    await Promise.all(updatedItems.map(hat => hatStorage.setHat(hat)));
    setHats(updatedItems);
  };

  return (
    <VStack p={6} bg={bg} minH="100vh" color={textColor}>
      <form onSubmit={handleSubmit(handleSave)} style={{ width: '100%', maxWidth: '800px' }}>
        <Accordion index={expandedPanels} onChange={handleAccordionChange} allowMultiple>
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
                <GridItem display="flex" alignItems="center" gap={2} position="relative" zIndex={2}>
                  <FormControl id="language-select">
                    <Controller
                      control={control}
                      name="language"
                      render={({ field: { onChange, value } }) => (
                        <Select<LanguageOption>
                          value={SUPPORTED_LANGUAGES.find(lang => lang.code === value)}
                          onChange={option => {
                            const languageCode = option?.code || DEFAULT_LANGUAGE_CODE;
                            onChange(languageCode);
                            languageStorage.set(languageCode);
                          }}
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
                      )}
                    />
                    <FormHelperText color={textColorSecondary} fontSize="xs">
                      Default output language for summarization. When a hat doesn&apos;t specify a language, it will use
                      this setting.
                    </FormHelperText>
                  </FormControl>
                  {savedSettings.language && <Icon as={CheckIcon} color="green.500" />}
                </GridItem>

                {/* Mode Setting */}
                <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                  <FormLabel fontWeight="medium" m={0} htmlFor="mode-select" color={textColor}>
                    Mode
                  </FormLabel>
                </GridItem>
                <GridItem display="flex" alignItems="center" gap={2}>
                  <FormControl id="mode-select">
                    <Controller
                      control={control}
                      name="mode"
                      render={({ field: { onChange, value } }) => (
                        <ButtonGroup size="sm" isAttached variant="outline">
                          <Button
                            onClick={() => {
                              onChange('simple');
                              modeStorage.set('simple');
                            }}
                            colorScheme={value === 'simple' ? 'blue' : undefined}
                            variant={value === 'simple' ? 'solid' : 'outline'}>
                            Simple
                          </Button>
                          <Button
                            onClick={() => {
                              onChange('advanced');
                              modeStorage.set('advanced');
                            }}
                            colorScheme={value === 'advanced' ? 'blue' : undefined}
                            variant={value === 'advanced' ? 'solid' : 'outline'}>
                            Advanced
                          </Button>
                        </ButtonGroup>
                      )}
                    />
                    <FormHelperText color={textColorSecondary} fontSize="xs">
                      Simple mode shows language selection, Advanced mode shows hat selection
                    </FormHelperText>
                  </FormControl>
                  {savedSettings.mode && <Icon as={CheckIcon} color="green.500" />}
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
                        <Switch
                          isChecked={value}
                          onChange={e => {
                            onChange(e.target.checked);
                            openInWebStorage.set(e.target.checked);
                            chrome.tabs.query({}, tabs => {
                              tabs.forEach(tab => {
                                if (tab.id) {
                                  chrome.tabs.sendMessage(tab.id, {
                                    type: 'OPEN_IN_WEB_CHANGED',
                                    value: e.target.checked,
                                  });
                                }
                              });
                            });
                            setSavedSettings(prev => ({ ...prev, openInWeb: true }));
                          }}
                          size="lg"
                        />
                      )}
                    />
                    <FormHelperText color={textColorSecondary} fontSize="xs">
                      When enabled, Slack links will open in your browser instead of the desktop app, allowing you to
                      use Chu Chu Chu for thread summarization.
                    </FormHelperText>
                  </FormControl>
                  {savedSettings.openInWeb && <Icon as={CheckIcon} color="green.500" />}
                </GridItem>
              </Grid>
            </AccordionPanel>
          </AccordionItem>

          {isAdvancedMode ? (
            <AccordionItem borderColor={borderColor}>
              <h2>
                <AccordionButton _hover={{ bg: buttonBg }}>
                  <Box as="span" flex="1" textAlign="left">
                    <HStack spacing={2}>
                      <Heading size="md">Hats</Heading>
                      <Tooltip
                        label="Hats are like different personas for the AI. Each hat can have its own prompt, language, model, and URL pattern. Switch between hats to get different types of responses based on your needs."
                        placement="top"
                        hasArrow>
                        <InfoIcon color="primary.500" boxSize={4} />
                      </Tooltip>
                    </HStack>
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="red"
                    leftIcon={<RepeatIcon />}
                    mr={2}
                    onClick={handleResetClick}
                    title="Reset all hats to their default settings">
                    <Tooltip
                      label="Reset all hats to their default settings. This will remove any custom hats you've created and restore the original set of hats."
                      placement="top"
                      hasArrow>
                      <span>Reset</span>
                    </Tooltip>
                  </Button>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <VStack spacing={4} align="stretch">
                  {!hats || hats.length === 0 ? (
                    <Text color={textColorSecondary}>No hats added yet</Text>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="hats">
                        {provided => (
                          <VStack {...provided.droppableProps} ref={provided.innerRef} spacing={4} align="stretch">
                            {hats.map((hat, index) => (
                              <Draggable key={hat.id} draggableId={hat.id} index={index}>
                                {(provided, snapshot) => (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
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
                                    bg={snapshot.isDragging ? hoverBg : undefined}
                                    transition="all 0.2s">
                                    <HStack spacing={2}>
                                      <Box {...provided.dragHandleProps} cursor="grab" _active={{ cursor: 'grabbing' }}>
                                        <DragHandleIcon color={textColorSecondary} />
                                      </Box>
                                      {hat.language ? (
                                        <Text color={textColorSecondary} fontSize="md">
                                          {getLanguageFlag(hat.language)}
                                        </Text>
                                      ) : null}
                                      <Text fontWeight="bold">{hat.label}</Text>
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
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </VStack>
                        )}
                      </Droppable>
                    </DragDropContext>
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
          ) : null}
        </Accordion>
      </form>

      {isAdvancedMode ? (
        <>
          <HatEditor
            isOpen={isModalOpen}
            onClose={handleModalClose}
            editingHat={editingHat}
            onSave={handleSaveHat}
            allHats={hats}
          />

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

          <AlertDialog
            isOpen={isResetAlertOpen}
            leastDestructiveRef={cancelDeleteRef}
            onClose={() => setIsResetAlertOpen(false)}>
            <AlertDialogOverlay>
              <AlertDialogContent bg={bg} color={textColor}>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  Reset Hats
                </AlertDialogHeader>

                <AlertDialogBody>
                  Are you sure you want to reset all hats to default? This will remove any custom hats you&apos;ve
                  created.
                </AlertDialogBody>

                <AlertDialogFooter>
                  <Button ref={cancelDeleteRef} onClick={() => setIsResetAlertOpen(false)} variant="ghost" mr={3}>
                    Cancel
                  </Button>
                  <Button colorScheme="red" onClick={handleResetConfirm} fontWeight="bold">
                    Reset
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </>
      ) : null}
    </VStack>
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
  withSuspense(() => <OptionsWithRouter />, <div> Loading ... </div>),
  <div> Error Occur </div>,
);

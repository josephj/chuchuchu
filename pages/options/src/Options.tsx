import { useRef, useEffect, useState } from 'react';
import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
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
} from '@chakra-ui/react';
import { CheckIcon, AddIcon, DeleteIcon, EditIcon, CopyIcon } from '@chakra-ui/icons';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OptionsFormData, Hat, HatList, HatListItem } from './types';
import { optionsFormSchema } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, languageStorage, openInWebStorage, hatsStorage } from './vars';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Theme as ReactSelectTheme } from 'react-select';
import { HatEditor } from './HatEditor';
import { storage } from './storage';

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
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const [hatToDelete, setHatToDelete] = useState<Hat | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const [hats, setHats] = useState<Hat[]>([]);
  const { colorMode } = useColorMode();
  const isLight = colorMode === 'light';

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

  const selectTheme = createSelectTheme(isLight);

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

  const handleSaveHat = async (hat: Hat) => {
    try {
      // Save the full hat data
      await storage.setHat(hat);

      // Get and update the hat list
      const currentList = await storage.getHatList();
      let updatedList: HatList;

      if (location.pathname.includes('/hats/edit/')) {
        updatedList = currentList.map(h =>
          h.id === hat.id
            ? {
                id: hat.id,
                label: hat.label,
                alias: hat.alias,
                urlPattern: hat.urlPattern,
                model: hat.model,
                language: hat.language,
              }
            : h,
        );
      } else {
        const listItem: HatListItem = {
          id: hat.id,
          label: hat.label,
          alias: hat.alias,
          urlPattern: hat.urlPattern,
          model: hat.model,
          language: hat.language,
        };
        updatedList = [...currentList, listItem];
      }

      await storage.setHatList(updatedList);

      // Refresh the UI
      loadHats();
    } catch (error) {
      console.error('Failed to save hat:', error);
    }
  };

  const loadHats = async () => {
    const list = await storage.getHatList();
    const fullHats = await Promise.all(list.map(item => storage.getHat(item.id)));
    setHats(fullHats.filter((hat): hat is Hat => hat !== null));
  };

  // Load hats on mount and after migration
  useEffect(() => {
    storage.migrateFromOldStorage().then(loadHats);
  }, []);

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
                <GridItem display="flex" alignItems="center" gap={2} position="relative" zIndex={2}>
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
                  </FormControl>
                  {savedSettings.language && <Icon as={CheckIcon} color="green.500" />}
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

      <HatEditor
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingHat={editingHat}
        onSave={handleSaveHat}
        allHats={hats}
      />

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
  withSuspense(() => <OptionsWithRouter />, <div> Loading ... </div>),
  <div> Error Occur </div>,
);

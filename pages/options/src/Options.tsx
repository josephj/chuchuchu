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
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme as ReactSelectTheme } from 'react-select';
import type { OptionsFormData } from './types';
import { optionsFormSchema } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from './vars';

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

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const selectedLanguage = useStorage(languageStorage);
  const openInWeb = useStorage(openInWebStorage);
  const isLight = theme === 'light';
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  // Add Dracula theme colors
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

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

  return (
    <Center p={6} bg={bg} minH="100vh" color={textColor}>
      <form onChange={handleSubmit(onSubmit)} style={{ width: '100%', maxWidth: '800px' }}>
        <Accordion defaultIndex={[0, 1]} allowMultiple>
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
        </Accordion>
      </form>
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

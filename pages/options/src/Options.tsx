import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { theme } from '../../side-panel/src/theme';
import { type JSX, Fragment } from 'react';
import {
  Center,
  Switch,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  FormHelperText,
  Icon,
  Input,
  Heading,
  Box,
  List,
  ListItem,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Button,
  Collapse,
  useColorModeValue,
  VStack,
  Textarea,
  IconButton,
  ChakraProvider,
} from '@chakra-ui/react';
import { CheckIcon, ChevronUpIcon, ChevronDownIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme as ReactSelectTheme } from 'react-select';
import type { OptionsFormData, UrlPattern } from './types';
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

// Model API Keys Storage
const openAIKeyStorage = createStorage<string>('openai-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const anthropicKeyStorage = createStorage<string>('anthropic-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const deepseekKeyStorage = createStorage<string>('deepseek-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const googleKeyStorage = createStorage<string>('google-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const ollamaUrlStorage = createStorage<string>('ollama-url', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const groqKeyStorage = createStorage<string>('groq-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const urlPatternsStorage = createStorage<UrlPattern[]>('url-patterns', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

type ModelInfo = {
  openai?: string[];
  anthropic?: string[];
  deepseek?: string[];
  google?: string[];
  ollama?: string[];
  groq?: string[];
};

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const selectedLanguage = useStorage(languageStorage);
  const openInWeb = useStorage(openInWebStorage);
  const openAIKey = useStorage(openAIKeyStorage);
  const anthropicKey = useStorage(anthropicKeyStorage);
  const deepseekKey = useStorage(deepseekKeyStorage);
  const googleKey = useStorage(googleKeyStorage);
  const ollamaUrl = useStorage(ollamaUrlStorage);
  const groqKey = useStorage(groqKeyStorage);
  const urlPatterns = useStorage(urlPatternsStorage);
  const isLight = theme === 'light';
  const [savedSettings, setSavedSettings] = useState<{ [K in keyof OptionsFormData]?: boolean }>({});
  const [modelList, setModelList] = useState<ModelInfo>({});
  const [isLoadingModels, setIsLoadingModels] = useState<{ [key: string]: boolean }>({});
  const [expandedModels, setExpandedModels] = useState<{ [key: string]: boolean }>({});
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
      openAIKey: openAIKey || '',
      anthropicKey: anthropicKey || '',
      deepseekKey: deepseekKey || '',
      googleKey: googleKey || '',
      ollamaUrl: ollamaUrl || '',
      groqKey: groqKey || '',
    },
  });

  useEffect(() => {
    setValue('language', selectedLanguage);
    setValue('openInWeb', openInWeb);
    setValue('openAIKey', openAIKey || '');
    setValue('anthropicKey', anthropicKey || '');
    setValue('deepseekKey', deepseekKey || '');
    setValue('googleKey', googleKey || '');
    setValue('ollamaUrl', ollamaUrl || '');
    setValue('groqKey', groqKey || '');
  }, [setValue, selectedLanguage, openInWeb, openAIKey, anthropicKey, deepseekKey, googleKey, ollamaUrl, groqKey]);

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

    // Handle API key changes
    if (data.openAIKey !== openAIKey) {
      await openAIKeyStorage.set(data.openAIKey);
      setSavedSettings(prev => ({ ...prev, openAIKey: true }));
    }

    if (data.anthropicKey !== anthropicKey) {
      await anthropicKeyStorage.set(data.anthropicKey);
      setSavedSettings(prev => ({ ...prev, anthropicKey: true }));
    }

    if (data.deepseekKey !== deepseekKey) {
      await deepseekKeyStorage.set(data.deepseekKey);
      setSavedSettings(prev => ({ ...prev, deepseekKey: true }));
    }

    if (data.googleKey !== googleKey) {
      await googleKeyStorage.set(data.googleKey);
      setSavedSettings(prev => ({ ...prev, googleKey: true }));
    }

    if (data.ollamaUrl !== ollamaUrl) {
      await ollamaUrlStorage.set(data.ollamaUrl);
      setSavedSettings(prev => ({ ...prev, ollamaUrl: true }));
    }

    if (data.groqKey !== groqKey) {
      await groqKeyStorage.set(data.groqKey);
      setSavedSettings(prev => ({ ...prev, groqKey: true }));
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

  const fetchOpenAIModels = async (key: string) => {
    try {
      setIsLoadingModels(prev => ({ ...prev, openai: true }));
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
      if (!response.ok) throw new Error('Invalid API key');
      const data = await response.json();
      // Filter for chat models only
      const chatModels = data.data
        .map((model: { id: string }) => model.id)
        .filter((id: string) => id.includes('gpt') && (id.includes('turbo') || id.endsWith('-preview')));
      setModelList(prev => ({
        ...prev,
        openai: chatModels,
      }));
    } catch (error) {
      setModelList(prev => ({ ...prev, openai: undefined }));
    } finally {
      setIsLoadingModels(prev => ({ ...prev, openai: false }));
    }
  };

  const fetchAnthropicModels = async (key: string) => {
    try {
      setIsLoadingModels(prev => ({ ...prev, anthropic: true }));
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!response.ok) throw new Error('Invalid API key');
      const data = await response.json();
      // Filter for chat models only (Claude models)
      const chatModels = data.models
        .map((model: { id: string }) => model.id)
        .filter((id: string) => id.startsWith('claude'));
      setModelList(prev => ({
        ...prev,
        anthropic: chatModels,
      }));
    } catch (error) {
      setModelList(prev => ({ ...prev, anthropic: undefined }));
    } finally {
      setIsLoadingModels(prev => ({ ...prev, anthropic: false }));
    }
  };

  const fetchOllamaModels = async (url: string) => {
    try {
      setIsLoadingModels(prev => ({ ...prev, ollama: true }));
      const response = await fetch(`${url}/api/tags`);
      if (!response.ok) throw new Error('Invalid URL');
      const data = await response.json();
      // Filter for chat models (excluding specific task models)
      const chatModels = data.models
        .map((model: { name: string }) => model.name)
        .filter(
          (name: string) =>
            !name.includes('codegen') &&
            !name.includes('instruct') &&
            !name.includes('code-') &&
            !name.includes('-vision'),
        );
      setModelList(prev => ({
        ...prev,
        ollama: chatModels,
      }));
    } catch (error) {
      setModelList(prev => ({ ...prev, ollama: undefined }));
    } finally {
      setIsLoadingModels(prev => ({ ...prev, ollama: false }));
    }
  };

  // Add effect to check and fetch models when keys change
  useEffect(() => {
    if (openAIKey) fetchOpenAIModels(openAIKey);
  }, [openAIKey]);

  useEffect(() => {
    if (anthropicKey) fetchAnthropicModels(anthropicKey);
  }, [anthropicKey]);

  useEffect(() => {
    if (ollamaUrl) fetchOllamaModels(ollamaUrl);
  }, [ollamaUrl]);

  const toggleModelList = (provider: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const renderModelList = (provider: keyof ModelInfo, models?: string[]) => {
    if (!models?.length) return null;

    return (
      <Box mt={2}>
        <Button
          width="100%"
          variant="ghost"
          onClick={() => toggleModelList(provider)}
          rightIcon={expandedModels[provider] ? <ChevronDownIcon /> : <ChevronUpIcon />}
          size="sm"
          color={textColorSecondary}>
          Available Models {models.length > 0 && `(${models.length})`}
        </Button>
        <Collapse in={expandedModels[provider]}>
          <Box pt={2}>
            {isLoadingModels[provider] ? (
              <Spinner size="sm" />
            ) : (
              <List spacing={1}>
                {models.map(model => (
                  <ListItem key={model} fontSize="sm" color="gray.600">
                    {model}
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const handleAddPattern = () => {
    const newPattern: UrlPattern = {
      pattern: '',
      model: '',
      prompt: '',
    };
    urlPatternsStorage.set([...(urlPatterns || []), newPattern]);
  };

  const handleUpdatePattern = (index: number, field: keyof UrlPattern, value: string) => {
    const updatedPatterns = [...(urlPatterns || [])];
    updatedPatterns[index] = {
      ...updatedPatterns[index],
      [field]: value,
    };
    urlPatternsStorage.set(updatedPatterns);
  };

  const handleDeletePattern = (index: number) => {
    const updatedPatterns = [...(urlPatterns || [])];
    updatedPatterns.splice(index, 1);
    urlPatternsStorage.set(updatedPatterns);
  };

  return (
    <Center p={6} bg={bg} minH="100vh" color={textColor}>
      <form onChange={handleSubmit(onSubmit)} style={{ width: '100%', maxWidth: '800px' }}>
        <Accordion defaultIndex={[0]} allowMultiple>
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

          {/* Model Settings */}
          <AccordionItem borderColor={borderColor}>
            <h2>
              <AccordionButton _hover={{ bg: buttonBg }}>
                <Box as="span" flex="1" textAlign="left">
                  <Heading size="md">Model Settings</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Grid templateColumns="200px 1fr" gap={6} alignItems="start" w="full">
                {/* API Key Inputs */}
                {Object.entries({
                  'OpenAI API Key': { name: 'openAIKey', placeholder: 'sk-...' },
                  'Anthropic API Key': { name: 'anthropicKey', placeholder: 'sk-ant-...' },
                  'DeepSeek API Key': { name: 'deepseekKey', placeholder: '...' },
                  'Google API Key': { name: 'googleKey', placeholder: '...' },
                  'Groq API Key': { name: 'groqKey', placeholder: 'gsk_...' },
                }).map(
                  ([label, { name, placeholder }]): JSX.Element => (
                    <Fragment key={name}>
                      <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                        <FormLabel fontWeight="medium" m={0} htmlFor={name} color={textColor}>
                          {label}
                        </FormLabel>
                      </GridItem>
                      <GridItem display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControl id={name}>
                            <Controller
                              control={control}
                              name={name as keyof OptionsFormData}
                              render={({ field: { value, ...rest } }) => (
                                <Input
                                  {...rest}
                                  value={typeof value === 'string' ? value : ''}
                                  type="password"
                                  placeholder={placeholder}
                                  bg={bg}
                                  borderColor={borderColor}
                                  _hover={{ borderColor: 'dracula.purple' }}
                                  _focus={{
                                    borderColor: 'dracula.purple',
                                    boxShadow: 'none',
                                  }}
                                />
                              )}
                            />
                          </FormControl>
                          {savedSettings[name as keyof typeof savedSettings] && (
                            <Icon as={CheckIcon} color="dracula.green" />
                          )}
                        </Box>
                        {name === 'openAIKey' && renderModelList('openai', modelList.openai)}
                        {name === 'anthropicKey' && renderModelList('anthropic', modelList.anthropic)}
                        {name === 'ollamaUrl' && renderModelList('ollama', modelList.ollama)}
                      </GridItem>
                    </Fragment>
                  ),
                )}

                {/* Ollama URL */}
                <GridItem display="flex" justifyContent="flex-end" alignItems="center" pr={4}>
                  <FormLabel fontWeight="medium" m={0} htmlFor="ollama-url" color={textColor}>
                    Ollama URL
                  </FormLabel>
                </GridItem>
                <GridItem display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <FormControl id="ollama-url">
                      <Controller
                        control={control}
                        name="ollamaUrl"
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="text"
                            placeholder="http://localhost:11434"
                            bg={bg}
                            borderColor={borderColor}
                            _hover={{ borderColor: 'dracula.purple' }}
                            _focus={{
                              borderColor: 'dracula.purple',
                              boxShadow: 'none',
                            }}
                          />
                        )}
                      />
                    </FormControl>
                    {savedSettings.ollamaUrl && <Icon as={CheckIcon} color="dracula.green" />}
                  </Box>
                  {renderModelList('ollama', modelList.ollama)}
                </GridItem>
              </Grid>
            </AccordionPanel>
          </AccordionItem>

          {/* URL Pattern Mapping */}
          <AccordionItem borderColor={borderColor}>
            <h2>
              <AccordionButton _hover={{ bg: buttonBg }}>
                <Box as="span" flex="1" textAlign="left">
                  <Heading size="md">URL Pattern Mapping</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack spacing={4} align="stretch">
                {urlPatterns?.map((pattern, index) => (
                  <Grid key={index} templateColumns="1fr 1fr 2fr auto" gap={4} alignItems="start">
                    <FormControl>
                      <FormLabel fontSize="sm" color={textColor}>
                        URL Pattern
                      </FormLabel>
                      <Input
                        size="sm"
                        value={pattern.pattern}
                        onChange={e => handleUpdatePattern(index, 'pattern', e.target.value)}
                        placeholder="e.g., *://*.youtube.com/*"
                        bg={bg}
                        borderColor={borderColor}
                        _hover={{ borderColor: 'dracula.purple' }}
                        _focus={{
                          borderColor: 'dracula.purple',
                          boxShadow: 'none',
                        }}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm" color={textColor}>
                        Model
                      </FormLabel>
                      <Select<{ value: string; label: string }>
                        value={{ value: pattern.model, label: pattern.model }}
                        onChange={option => handleUpdatePattern(index, 'model', option?.value || '')}
                        options={[
                          ...(modelList.openai?.map(model => ({ value: model, label: model })) || []),
                          ...(modelList.anthropic?.map(model => ({ value: model, label: model })) || []),
                          ...(modelList.ollama?.map(model => ({ value: model, label: model })) || []),
                        ]}
                        styles={{
                          ...selectStyles,
                          control: (base: Record<string, unknown>) => ({
                            ...base,
                            minHeight: '32px',
                            backgroundColor: theme === 'light' ? 'dracula.light.background' : 'dracula.background',
                            borderColor: theme === 'light' ? 'dracula.light.currentLine' : 'dracula.currentLine',
                          }),
                        }}
                        theme={selectTheme}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm" color={textColor}>
                        Custom Prompt
                      </FormLabel>
                      <Textarea
                        size="sm"
                        value={pattern.prompt}
                        onChange={e => handleUpdatePattern(index, 'prompt', e.target.value)}
                        placeholder="Enter custom prompt..."
                        rows={3}
                        bg={bg}
                        borderColor={borderColor}
                        _hover={{ borderColor: 'dracula.purple' }}
                        _focus={{
                          borderColor: 'dracula.purple',
                          boxShadow: 'none',
                        }}
                      />
                    </FormControl>
                    <IconButton
                      aria-label="Delete pattern"
                      icon={<DeleteIcon />}
                      onClick={() => handleDeletePattern(index)}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      alignSelf="flex-end"
                      color={textColor}
                      _hover={{ bg: buttonBg }}
                    />
                  </Grid>
                ))}
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddPattern}
                  size="sm"
                  alignSelf="flex-start"
                  bg={buttonBg}
                  color={textColor}
                  _hover={{ bg: 'dracula.purple' }}>
                  Add Pattern
                </Button>
              </VStack>
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

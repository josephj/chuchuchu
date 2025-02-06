import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useColorModeValue,
  Spinner,
  Box,
} from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import { OLLAMA_API_ENDPOINT } from '@extension/shared';
import { customModelsStorage, type CustomModel } from './vars';

type Model = {
  name: string;
  size?: string;
  digest?: string;
  modified_at?: string;
};

type ModelOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type ModelType = 'ollama' | 'anthropic' | 'deepseek' | 'openai';

const MODEL_TYPES = [
  { value: 'ollama', label: 'Ollama' },
  // To be added later:
  // { value: 'anthropic', label: 'Anthropic' },
  // { value: 'deepseek', label: 'DeepSeek' },
  // { value: 'openai', label: 'OpenAI' },
] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: string) => void;
};

export const ModelSelector = ({ isOpen, onClose, onSelect }: Props) => {
  const [models, setModels] = useState<Model[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [selectedType, setSelectedType] = useState<ModelType>('ollama');
  const [baseUrl, setBaseUrl] = useState(OLLAMA_API_ENDPOINT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);

  // Create a list of already added model names
  const addedModelNames = useMemo(() => customModels.map(model => model.value.replace('ollama/', '')), [customModels]);

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const isLight = useColorModeValue(true, false);

  const selectTheme = (theme: any) => ({
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

  useEffect(() => {
    const fetchModels = async () => {
      if (selectedType !== 'ollama') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const fetchedModels = data.models || [];

        // Create options with isDisabled flag
        const options = fetchedModels.map((model: Model) => ({
          value: model.name,
          label: model.name,
          isDisabled: addedModelNames.includes(model.name),
        }));

        setModelOptions(options);

        // Auto-select the first available model
        const firstAvailable = options.find(option => !option.isDisabled);
        setSelectedModel(firstAvailable || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchModels();
    }
  }, [isOpen, selectedType, baseUrl, addedModelNames]);

  useEffect(() => {
    customModelsStorage.get().then(setCustomModels);
  }, []);

  const handleSave = () => {
    if (selectedModel) {
      const newCustomModel: CustomModel = {
        value: `ollama/${selectedModel.value}`,
        label: `Ollama: ${selectedModel.value}`,
        type: 'ollama',
        baseUrl,
      };

      customModelsStorage.get().then(models => {
        const updatedModels = [...models, newCustomModel];
        customModelsStorage.set(updatedModels);
        setCustomModels(updatedModels);
      });

      onSelect(newCustomModel.value);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bg} color={textColor}>
        <ModalHeader>Select Model</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Type</FormLabel>
              <Select
                value={MODEL_TYPES.find(type => type.value === selectedType)}
                onChange={option => option && setSelectedType(option.value as ModelType)}
                options={MODEL_TYPES}
                theme={selectTheme}
              />
            </FormControl>

            {selectedType === 'ollama' && (
              <FormControl>
                <FormLabel>Base URL</FormLabel>
                <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Enter Ollama API URL" />
              </FormControl>
            )}

            <FormControl>
              <FormLabel>Model</FormLabel>
              {isLoading ? (
                <Box textAlign="center" py={4}>
                  <Spinner />
                </Box>
              ) : error ? (
                <Text color="red.500">{error}</Text>
              ) : (
                <Select
                  value={selectedModel}
                  onChange={option => setSelectedModel(option)}
                  options={modelOptions}
                  theme={selectTheme}
                  isSearchable
                  isOptionDisabled={option => option.isDisabled}
                  noOptionsMessage={() => 'No available models'}
                />
              )}
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} mr={3}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isDisabled={!selectedModel}>
            Add Model
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

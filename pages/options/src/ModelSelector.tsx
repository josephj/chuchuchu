import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  useColorModeValue,
  Spinner,
  Box,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { OLLAMA_API_ENDPOINT } from '@extension/shared';

type Model = {
  name: string;
  size?: string;
  digest?: string;
  modified_at?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: string) => void;
};

export const ModelSelector = ({ isOpen, onClose, onSelect }: Props) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${OLLAMA_API_ENDPOINT}/api/tags`);
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bg} color={textColor}>
        <ModalHeader>Select Model</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Box textAlign="center" py={8}>
              <Spinner />
            </Box>
          ) : error ? (
            <Text color="red.500">{error}</Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {models.map(model => (
                <Box
                  key={model.name}
                  p={3}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onClick={() => {
                    onSelect(model.name);
                    onClose();
                  }}>
                  <Text fontWeight="medium">{model.name}</Text>
                  {model.size && (
                    <Text fontSize="sm" color="gray.500">
                      Size: {model.size}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

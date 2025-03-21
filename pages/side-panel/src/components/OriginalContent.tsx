import { Box, Button, Collapse, IconButton, Text, Tooltip, VStack, useColorModeValue } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon } from '@chakra-ui/icons';
import { useCallback } from 'react';
import { estimateTokens } from '../utils';
import type { ThreadData } from '../types';

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  originalContent: string;
  contentType: 'slack' | 'article' | null;
  threadData: ThreadData | null;
};

export const OriginalContent = ({ isOpen, onToggle, originalContent, contentType, threadData }: Props) => {
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(originalContent).then(
      () => {
        // Success - could add toast notification here if desired
      },
      err => {
        console.error('Failed to copy text:', err);
      },
    );
  }, [originalContent]);

  return (
    <Box borderTop="1px" borderColor={borderColor}>
      <Button
        width="100%"
        variant="ghost"
        fontSize="xs"
        onClick={onToggle}
        rightIcon={isOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
        size="sm"
        color={textColorSecondary}>
        Original content ({estimateTokens(originalContent)} tokens)
      </Button>
      <Collapse in={isOpen}>
        <Box position="relative">
          <Box p={4} maxH="300px" overflowY="auto" overflowX="hidden" fontSize="sm" whiteSpace="pre-wrap">
            {contentType === 'slack' && threadData ? (
              <VStack align="stretch" spacing={4}>
                {threadData.messages.map((msg, index) => (
                  <Box key={index}>
                    <Text fontWeight="bold">{msg.user}</Text>
                    <Text>{msg.text}</Text>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text>{originalContent}</Text>
            )}
            <Tooltip hasArrow label="Copy content" placement="left" fontSize="xs">
              <IconButton
                aria-label="Copy content"
                icon={<CopyIcon />}
                onClick={handleCopyContent}
                size="sm"
                variant="ghost"
                position="absolute"
                bottom={5}
                right={5}
                bg="whiteAlpha.800"
                _dark={{ bg: 'blackAlpha.800' }}
                _hover={{
                  bg: 'whiteAlpha.900',
                  _dark: { bg: 'blackAlpha.900' },
                }}
              />
            </Tooltip>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

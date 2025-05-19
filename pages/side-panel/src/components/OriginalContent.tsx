import { Box, Button, Collapse, IconButton, Text, Tooltip, useColorModeValue, Flex, Image } from '@chakra-ui/react';
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
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(originalContent);
  }, [originalContent]);

  const isScreenshot = originalContent.startsWith('data:image');

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
            <Flex direction="column" gap={4}>
              {isScreenshot ? (
                <Box>
                  <Text fontSize="sm" color={textColor} mb={2}>
                    Screenshot:
                  </Text>
                  <Image
                    src={originalContent}
                    alt="Screenshot"
                    maxH="300px"
                    objectFit="contain"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                  />
                </Box>
              ) : contentType === 'slack' && threadData ? (
                <Box>
                  <Text fontSize="sm" color={textColor} mb={2}>
                    Original Thread:
                  </Text>
                  {threadData.messages.map((message, index) => (
                    <Box key={index} mb={2}>
                      <Text fontSize="xs" color={textColor} opacity={0.7}>
                        {message.user}:
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        {message.text}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box>
                  <Text fontSize="sm" color={textColor} mb={2}>
                    Original Content:
                  </Text>
                  <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap">
                    {originalContent}
                  </Text>
                </Box>
              )}
            </Flex>
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

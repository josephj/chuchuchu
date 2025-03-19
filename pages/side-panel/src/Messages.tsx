import { Box, Flex, Text, VStack, useColorModeValue, Button, Tooltip, IconButton, HStack } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useRef, useState } from 'react';
import { ViewIcon, ViewOffIcon, CopyIcon, DownloadIcon } from '@chakra-ui/icons';
import type { Message } from './types';
import { MdTextFormat } from 'react-icons/md';
import { getFormattedText, removeThinkBlocks } from './utils/textFormatters';
import { convertToDocx } from './utils/docxConverter';

type Props = {
  messages: Message[];
  isTyping: boolean;
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

const getMeaningfulFilename = (content: string, timestamp: number, extension: string): string => {
  // Get the first non-empty line that's not a heading
  const firstLine = content
    .split('\n')
    .find(line => line.trim() && !line.startsWith('#'))
    ?.trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .slice(0, 50); // Limit length

  // Format date as YYYY-MM-DD
  const date = new Date(timestamp).toISOString().split('T')[0];

  return `${firstLine || 'message'}-${date}.${extension}`;
};

export const Messages = ({ messages, isTyping }: Props) => {
  const [showThinkBlocks, setShowThinkBlocks] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageAssistantBg = useColorModeValue('transparent', 'dracula.background');
  const messageUserBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const codeBg = useColorModeValue('dracula.light.currentLine', 'dracula.background');
  const blockquoteBorderColor = useColorModeValue('dracula.light.purple', 'dracula.purple');
  const codeFg = useColorModeValue('dracula.light.pink', 'dracula.pink');
  const buttonColor = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const buttonHoverBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

  const hasThinkBlock = messages.some(
    message =>
      message.role === 'assistant' &&
      typeof message.content === 'string' &&
      /<think>[\s\S]*?<\/think>/.test(message.content),
  );

  const scrollToLatestMessage = (smooth = true) => {
    if (messagesEndRef.current?.parentElement) {
      const messages = messagesEndRef.current.parentElement.querySelectorAll('[data-message]');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const handleUserScroll = () => {
          window.removeEventListener('wheel', handleUserScroll);
          window.removeEventListener('touchmove', handleUserScroll);
          lastMessage.scrollIntoView({ behavior: 'auto', block: 'start' });
        };

        window.addEventListener('wheel', handleUserScroll, { passive: true });
        window.addEventListener('touchmove', handleUserScroll, { passive: true });

        lastMessage.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'start',
        });

        // Clean up event listeners after animation
        setTimeout(
          () => {
            window.removeEventListener('wheel', handleUserScroll);
            window.removeEventListener('touchmove', handleUserScroll);
          },
          smooth ? 300 : 0,
        );
      }
    }
  };

  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      scrollToLatestMessage();
    }
  }, [messages, isTyping]);

  return (
    <VStack spacing={4} align="stretch" px={4}>
      {hasThinkBlock && (
        <Flex justifyContent="flex-start" alignItems="center">
          <Tooltip label={showThinkBlocks ? 'Hide Thought Process' : 'Show Thought Process'}>
            <Button
              aria-label={showThinkBlocks ? 'Hide Thought Process' : 'Show Thought Process'}
              colorScheme="gray"
              leftIcon={showThinkBlocks ? <ViewOffIcon /> : <ViewIcon />}
              size="xs"
              onClick={() => setShowThinkBlocks(!showThinkBlocks)}>
              {showThinkBlocks ? 'Hide Thought Process' : 'Show Thought Process'}
            </Button>
          </Tooltip>
        </Flex>
      )}
      {showThinkBlocks && hasThinkBlock && (
        <Box
          pl={4}
          borderLeftWidth="4px"
          borderLeftColor={blockquoteBorderColor}
          color={textColorSecondary}
          fontSize="sm">
          {messages
            .filter(
              message =>
                message.role === 'assistant' &&
                typeof message.content === 'string' &&
                /<think>([\s\S]*?)<\/think>/.test(message.content),
            )
            .map(message =>
              typeof message.content === 'string' ? message.content.match(/<think>([\s\S]*?)<\/think>/)?.[1] || '' : '',
            )
            .join(' ')}
        </Box>
      )}
      {messages.map((message, index) => {
        if (message.role === 'assistant' && typeof message.content === 'string') {
          const processedContent = message.content.replace(/<think>[\s\S]*?<\/think>/g, '');

          return (
            <Flex
              key={index}
              data-message
              direction="column"
              bg={messageAssistantBg}
              borderRadius="lg"
              color={textColor}
              position="relative"
              _hover={{
                '& > .message-actions': {
                  opacity: 1,
                },
              }}>
              <Box
                sx={{
                  fontSize: '14px',
                  'h1, h2, h3, h4, h5, h6': {
                    fontWeight: 'bold',
                    my: 2,
                    color: 'dracula.purple',
                  },
                  h1: { fontSize: '2xl' },
                  h2: { fontSize: 'xl' },
                  h3: { fontSize: 'lg' },
                  p: {
                    my: 2,
                  },
                  'ul, ol': {
                    pl: 4,
                    my: 2,
                  },
                  ul: {
                    listStyleType: 'disc',
                  },
                  ol: {
                    listStyleType: 'decimal',
                  },
                  li: {
                    my: 1,
                    pl: 1,
                  },
                  code: {
                    bg: codeBg,
                    px: 1,
                    borderRadius: 'sm',
                    color: 'dracula.pink',
                  },
                  pre: {
                    bg: codeBg,
                    p: 2,
                    borderRadius: 'md',
                    overflowX: 'auto',
                  },
                  'pre code': {
                    color: codeFg,
                  },
                  blockquote: {
                    borderLeftWidth: '4px',
                    borderLeftColor: blockquoteBorderColor,
                    pl: 4,
                    my: 2,
                    color: 'dracula.yellow',
                  },
                  a: {
                    color: 'dracula.purple',
                    _hover: {
                      color: 'dracula.pink',
                    },
                  },
                }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: props => (
                      <Box overflowX="auto" my={4}>
                        <Box
                          as="table"
                          width="full"
                          sx={{
                            borderCollapse: 'collapse',
                            'th, td': {
                              border: '1px solid',
                              borderColor: 'dracula.currentLine',
                              px: 4,
                              py: 2,
                            },
                            th: {
                              bg: codeBg,
                              fontWeight: 'bold',
                            },
                            'tr:nth-of-type(even)': {
                              bg: messageAssistantBg,
                            },
                          }}
                          {...props}
                        />
                      </Box>
                    ),
                  }}>
                  {processedContent}
                </ReactMarkdown>
              </Box>
              <Flex justifyContent="flex-end" alignItems="center" mt={2}>
                <HStack spacing={1} className="message-actions" transition="all 0.2s">
                  <Tooltip label="Copy">
                    <IconButton
                      aria-label="Copy"
                      icon={<CopyIcon />}
                      size="xs"
                      variant="ghost"
                      color={buttonColor}
                      opacity={0.6}
                      _hover={{
                        opacity: 1,
                        bg: buttonHoverBg,
                      }}
                      onClick={() => {
                        if (typeof message.content === 'string') {
                          const cleanContent = removeThinkBlocks(message.content);
                          const formatted = getFormattedText(cleanContent);
                          copyToClipboard(formatted);
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip label="Copy as Markdown">
                    <IconButton
                      aria-label="Copy as Markdown"
                      icon={<CopyIcon />}
                      size="xs"
                      variant="ghost"
                      color={buttonColor}
                      opacity={0.6}
                      _hover={{
                        opacity: 1,
                        bg: buttonHoverBg,
                      }}
                      onClick={() => {
                        if (typeof message.content === 'string') {
                          const cleanContent = removeThinkBlocks(message.content);
                          copyToClipboard(cleanContent);
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip label="Download (docx)">
                    <IconButton
                      aria-label="Download (docx)"
                      icon={<DownloadIcon />}
                      size="xs"
                      variant="ghost"
                      color={buttonColor}
                      opacity={0.6}
                      _hover={{
                        opacity: 1,
                        bg: buttonHoverBg,
                      }}
                      onClick={async () => {
                        if (typeof message.content === 'string') {
                          const cleanContent = removeThinkBlocks(message.content);
                          const blob = await convertToDocx(cleanContent);
                          const filename = getMeaningfulFilename(cleanContent, message.timestamp, 'docx');
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip label="Download Markdown">
                    <IconButton
                      aria-label="Download Markdown"
                      icon={<DownloadIcon />}
                      size="xs"
                      variant="ghost"
                      color={buttonColor}
                      opacity={0.6}
                      _hover={{
                        opacity: 1,
                        bg: buttonHoverBg,
                      }}
                      onClick={() => {
                        if (typeof message.content === 'string') {
                          const cleanContent = removeThinkBlocks(message.content);
                          const filename = getMeaningfulFilename(cleanContent, message.timestamp, 'md');
                          downloadFile(cleanContent, filename, 'text/markdown');
                        }
                      }}
                    />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color={textColorSecondary} ml={2}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </Flex>
            </Flex>
          );
        }

        return (
          <Flex
            key={index}
            data-message
            direction="column"
            bg={message.role === 'assistant' ? messageAssistantBg : 'transparent'}
            borderRadius="lg"
            color={textColor}>
            {message.role === 'user' ? (
              <Box borderRadius="lg" bg={messageUserBg} display="inline-block" alignSelf="flex-end" p={2}>
                <Text fontSize="14px">{message.content}</Text>
              </Box>
            ) : (
              message.content
            )}
            <Flex justifyContent="flex-end" alignItems="center" mt={2}>
              <HStack spacing={1} className="message-actions" transition="all 0.2s">
                <Tooltip label="Copy">
                  <IconButton
                    aria-label="Copy"
                    icon={<MdTextFormat />}
                    size="xs"
                    variant="ghost"
                    color={buttonColor}
                    opacity={0.6}
                    _hover={{
                      opacity: 1,
                      bg: buttonHoverBg,
                    }}
                    onClick={() => {
                      if (typeof message.content === 'string') {
                        const cleanContent = removeThinkBlocks(message.content);
                        const formatted = getFormattedText(cleanContent);
                        copyToClipboard(formatted);
                      }
                    }}
                  />
                </Tooltip>
                <Tooltip label="Copy as Markdown">
                  <IconButton
                    aria-label="Copy as Markdown"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    color={buttonColor}
                    opacity={0.6}
                    _hover={{
                      opacity: 1,
                      bg: buttonHoverBg,
                    }}
                    onClick={() => {
                      if (typeof message.content === 'string') {
                        const cleanContent = removeThinkBlocks(message.content);
                        copyToClipboard(cleanContent);
                      }
                    }}
                  />
                </Tooltip>
                <Tooltip label="Download (Markdown)">
                  <IconButton
                    aria-label="Download Markdown"
                    icon={<DownloadIcon />}
                    size="xs"
                    variant="ghost"
                    color={buttonColor}
                    opacity={0.6}
                    _hover={{
                      opacity: 1,
                      bg: buttonHoverBg,
                    }}
                    onClick={() => {
                      if (typeof message.content === 'string') {
                        const cleanContent = removeThinkBlocks(message.content);
                        const filename = getMeaningfulFilename(cleanContent, message.timestamp, 'md');
                        downloadFile(cleanContent, filename, 'text/markdown');
                      }
                    }}
                  />
                </Tooltip>
                <Tooltip label="Download (docx)">
                  <IconButton
                    aria-label="Download (docx)"
                    icon={<DownloadIcon />}
                    size="xs"
                    variant="ghost"
                    color={buttonColor}
                    opacity={0.6}
                    _hover={{
                      opacity: 1,
                      bg: buttonHoverBg,
                    }}
                    onClick={async () => {
                      if (typeof message.content === 'string') {
                        const cleanContent = removeThinkBlocks(message.content);
                        const blob = await convertToDocx(cleanContent);
                        const filename = getMeaningfulFilename(cleanContent, message.timestamp, 'docx');
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }
                    }}
                  />
                </Tooltip>
              </HStack>
              <Text fontSize="xs" color={textColorSecondary} ml={2}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </Text>
            </Flex>
          </Flex>
        );
      })}
      {isTyping && (
        <Text fontSize="14px" color={textColorSecondary} animation="pulse 2s infinite">
          Assistant is typing...
        </Text>
      )}
      <Box ref={messagesEndRef} />
    </VStack>
  );
};

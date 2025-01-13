import { Box, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import { useEffect, useRef } from 'react';
import type { Message } from './types';

type Props = {
  messages: Message[];
  isTyping: boolean;
};

export const Messages = ({ messages, isTyping }: Props) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageAssistantBg = useColorModeValue('transparent', 'dracula.background');
  const messageUserBg = useColorModeValue('dracula.light.currentLine', 'dracula.background');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const codeBg = useColorModeValue('dracula.light.currentLine', 'dracula.background');
  const blockquoteBorderColor = useColorModeValue('dracula.light.purple', 'dracula.purple');

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
      {messages.map((message, index) => (
        <Box
          key={index}
          data-message
          bg={message.role === 'assistant' ? messageAssistantBg : messageUserBg}
          borderRadius="lg"
          color={textColor}>
          <Box>
            {message.role === 'user' ? (
              <Text fontSize="14px">{message.content}</Text>
            ) : typeof message.content === 'string' ? (
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
                    listStylePosition: 'inside',
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
                    color: 'dracula.green',
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
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            ) : (
              message.content
            )}
          </Box>
          <Text fontSize="xs" color={textColorSecondary} mt={2} textAlign="right">
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </Box>
      ))}
      {isTyping && (
        <Text fontSize="14px" color={textColorSecondary} animation="pulse 2s infinite">
          Assistant is typing...
        </Text>
      )}
      <Box ref={messagesEndRef} />
    </VStack>
  );
};

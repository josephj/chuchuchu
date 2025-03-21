import { Box, IconButton, Textarea, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import type { UseFormRegister, UseFormWatch, UseFormHandleSubmit } from 'react-hook-form';
import type { KeyboardEvent } from 'react';

type FormData = {
  question: string;
};

type Props = {
  register: UseFormRegister<FormData>;
  watch: UseFormWatch<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleFormSubmit: UseFormHandleSubmit<FormData, undefined>;
  isTyping: boolean;
};

export const QuestionInput = ({ register, watch, onSubmit, handleKeyDown, handleFormSubmit, isTyping }: Props) => {
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');

  return (
    <Box p={4} borderTop="1px" borderColor={borderColor} fontSize="13px">
      <form onSubmit={handleFormSubmit(onSubmit)}>
        <Box position="relative">
          <Textarea
            {...register('question')}
            onKeyDown={handleKeyDown}
            isDisabled={isTyping}
            rows={3}
            fontSize="13px"
            placeholder="Ask a follow-up question... (Cmd/Ctrl + Enter to submit)"
            resize="none"
            color={textColor}
            variant="outline"
            _placeholder={{ color: textColorSecondary }}
            pr="40px"
            sx={{
              '&:focus-visible': {
                '& + div': {
                  zIndex: 2,
                },
              },
            }}
          />
          <Box position="absolute" right="8px" top="8px" zIndex={1}>
            <Tooltip label="Send (Cmd/Ctrl + Enter)" placement="top" fontSize="xs">
              <IconButton
                type="submit"
                isDisabled={isTyping || !watch('question').trim()}
                colorScheme="blue"
                aria-label="Send message"
                icon={<ArrowUpIcon />}
                size="sm"
              />
            </Tooltip>
          </Box>
        </Box>
      </form>
    </Box>
  );
};

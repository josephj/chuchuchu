import {
  Stack,
  Flex,
  Text,
  Link,
  IconButton,
  Tooltip,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { CloseIcon, RepeatIcon } from '@chakra-ui/icons';

type Props = {
  threadUrl: string;
  articleTitle: string;
  isSlack: boolean;
  threadInfo?: {
    channelName: string;
    userName: string;
    timestamp: string;
  };
  onClose: () => void;
  onRegenerate: () => void;
  isOnOriginalPage?: boolean;
  hasContent?: boolean;
  onCapturePage?: () => void;
  pageType?: { type: string };
};

export const Header = ({
  threadUrl,
  articleTitle,
  isSlack,
  threadInfo,
  onClose,
  onRegenerate,
  isOnOriginalPage,
  hasContent,
  onCapturePage,
  pageType,
}: Props) => {
  const bg = useColorModeValue('dracula.light.background', 'dracula.background');
  const borderColor = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const linkColor = useColorModeValue('dracula.light.purple', 'dracula.purple');

  return (
    <Flex
      flexDirection="column"
      justify="space-between"
      position="sticky"
      top={0}
      zIndex={1}
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      p={4}
      width="100%">
      <Flex justify="space-between" width="100%" gap={1}>
        <Stack spacing={0} flex="1" width="calc(100% - 100px)">
          {isSlack && threadInfo ? (
            <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
              {threadInfo.channelName ? `#${threadInfo.channelName} • ` : ''}
              {threadInfo.userName} • {threadInfo.timestamp}{' '}
              <Tooltip label="Regenerate summary" placement="top" openDelay={500}>
                <IconButton
                  icon={<RepeatIcon />}
                  onClick={onRegenerate}
                  aria-label="Regenerate summary"
                  colorScheme="pink"
                  variant="ghost"
                  size="xs"
                />
              </Tooltip>
            </Text>
          ) : (
            articleTitle && (
              <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
                {articleTitle}{' '}
                <Tooltip fontSize="xs" label="Regenerate summary" placement="top" openDelay={500}>
                  <IconButton
                    icon={<RepeatIcon />}
                    onClick={onRegenerate}
                    aria-label="Regenerate summary"
                    colorScheme="pink"
                    variant="ghost"
                    size="xs"
                  />
                </Tooltip>
              </Text>
            )
          )}
          {threadUrl && (
            <Tooltip fontSize="xs" label={threadUrl} placement="bottom-start" openDelay={500}>
              <Link
                href={threadUrl}
                isExternal
                color={linkColor}
                fontSize="xs"
                isTruncated
                maxWidth="100%"
                _hover={{ textDecoration: 'underline' }}>
                {threadUrl}
              </Link>
            </Tooltip>
          )}
        </Stack>
        <Tooltip label="Clear conversation" placement="top" openDelay={500} fontSize="xs">
          <IconButton
            icon={<CloseIcon fontSize="10px" color="#ffffff" />}
            onClick={onClose}
            aria-label="Clear conversation"
            bg={useColorModeValue('#333333', '#666666')}
            color="#fffff"
            _hover={{
              bg: useColorModeValue('#666666', '#999999'),
            }}
            size="sm"
            isRound
          />
        </Tooltip>
      </Flex>
      {hasContent && !isOnOriginalPage && (
        <Alert alignItems="flex-start" status="warning" size="sm" mt={2} py={2} borderRadius="md">
          <AlertIcon mt="2px" />
          <Stack spacing={1}>
            <AlertTitle lineHeight="1.2">The summary is for another page</AlertTitle>
            <AlertDescription fontSize="xs" lineHeight="1.2">
              Please{' '}
              <Link color="red.500" onClick={onClose}>
                close
              </Link>{' '}
              this summary or{' '}
              {pageType?.type === 'slack' ? (
                'generate'
              ) : (
                <Link color="blue.500" onClick={onCapturePage}>
                  generate
                </Link>
              )}{' '}
              a new one for the current page.
            </AlertDescription>
          </Stack>
        </Alert>
      )}
    </Flex>
  );
};

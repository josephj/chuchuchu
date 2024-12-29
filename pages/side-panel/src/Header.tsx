import { Stack, Flex, Text, Link, IconButton, Tooltip, VStack, useColorModeValue } from '@chakra-ui/react';
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
};

const formatDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Get team ID (usually the first part after /messages/)
    const teamId = pathParts[2];
    // Get the channel and thread parts
    const remainingPath = pathParts.slice(3).join('/');
    return `/${teamId.slice(0, 6)}/${remainingPath}`;
  } catch {
    return url;
  }
};

export const Header = ({ threadUrl, articleTitle, isSlack, threadInfo, onClose, onRegenerate }: Props) => {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const linkColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Flex
      justify="space-between"
      position="sticky"
      top={0}
      zIndex={1}
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      p={4}
      width="100%">
      {threadUrl && (
        <Flex justify="space-between" width="100%" gap={1}>
          <Stack spacing={0} flex="1" width="calc(100% - 100px)">
            {isSlack && threadInfo ? (
              <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
                {threadInfo.channelName ? `#${threadInfo.channelName} • ` : ''}
                {threadInfo.userName} • {threadInfo.timestamp}
              </Text>
            ) : (
              articleTitle && (
                <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
                  {articleTitle}
                </Text>
              )
            )}
            <Tooltip label={threadUrl} placement="bottom-start" openDelay={500}>
              <Link
                href={threadUrl}
                isExternal
                color={linkColor}
                fontSize="xs"
                isTruncated
                maxWidth="100%"
                _hover={{ textDecoration: 'underline' }}>
                {isSlack ? formatDisplayUrl(threadUrl) : threadUrl}
              </Link>
            </Tooltip>
          </Stack>
          <VStack gap={2} flex="0" width="100px">
            <Tooltip label="Clear conversation" placement="top" openDelay={500}>
              <IconButton
                colorScheme="red"
                icon={<CloseIcon fontSize="8px" />}
                onClick={onClose}
                aria-label="Clear conversation"
                variant="outline"
                size="xs"
              />
            </Tooltip>
            <Tooltip label="Regenerate summary" placement="top" openDelay={500}>
              <IconButton
                icon={<RepeatIcon />}
                onClick={onRegenerate}
                aria-label="Regenerate summary"
                colorScheme="green"
                variant="outline"
                size="xs"
              />
            </Tooltip>
          </VStack>
        </Flex>
      )}
    </Flex>
  );
};

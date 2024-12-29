import { Box, Flex, Text, Link, IconButton, Tooltip, VStack, useColorModeValue } from '@chakra-ui/react';
import { DeleteIcon, RepeatIcon } from '@chakra-ui/icons';

type Props = {
  threadUrl: string;
  articleTitle: string;
  isSlack: boolean;
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

export const Header = ({ threadUrl, articleTitle, isSlack, onClose, onRegenerate }: Props) => {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const linkColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Box position="sticky" top={0} zIndex={1} bg={bg} borderBottom="1px" borderColor={borderColor} pb={4}>
      <Box>
        <Text>Hello</Text>
      </Box>
      {threadUrl && (
        <VStack spacing={2} align="stretch" width="100%" pt={4} px={4}>
          {!isSlack && articleTitle && (
            <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={2}>
              {articleTitle}
            </Text>
          )}
          <Flex align="center" gap={4} width="100%">
            <Tooltip label={threadUrl} placement="bottom-start" openDelay={500}>
              <Link
                href={threadUrl}
                isExternal
                color={linkColor}
                fontSize="xs"
                isTruncated
                _hover={{ textDecoration: 'underline' }}>
                {isSlack ? formatDisplayUrl(threadUrl) : threadUrl}
              </Link>
            </Tooltip>
            <Flex shrink={0} gap={2}>
              <Tooltip label="Clear conversation" placement="top" openDelay={500}>
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={onClose}
                  aria-label="Clear conversation"
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                />
              </Tooltip>
              <Tooltip label="Regenerate summary" placement="top" openDelay={500}>
                <IconButton
                  icon={<RepeatIcon />}
                  onClick={onRegenerate}
                  aria-label="Regenerate summary"
                  colorScheme="blue"
                  variant="ghost"
                  size="sm"
                />
              </Tooltip>
            </Flex>
          </Flex>
        </VStack>
      )}
    </Box>
  );
};

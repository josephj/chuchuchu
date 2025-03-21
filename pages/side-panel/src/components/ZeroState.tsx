import { Button, Flex, HStack, Text, Tooltip, VStack, useColorModeValue } from '@chakra-ui/react';

type Props = {
  pageType: {
    type: string;
    url?: string;
  };
  isThreadPaneAvailable: boolean;
  isContentScriptLoaded: boolean;
  isOptionsPage: boolean;
  isCapturing: boolean;
  isRestrictedDomain: boolean;
  isPageLoading: boolean;
  readabilityChecked: boolean;
  isReadable: boolean;
  domReady: boolean;
  handleSummarizeSlack: () => void;
  handleCapturePage: () => void;
  handleReloadPage: () => void;
};

export const ZeroState = ({
  pageType,
  isThreadPaneAvailable,
  isContentScriptLoaded,
  isOptionsPage,
  isCapturing,
  isRestrictedDomain,
  isPageLoading,
  readabilityChecked,
  isReadable,
  domReady,
  handleSummarizeSlack,
  handleCapturePage,
  handleReloadPage,
}: Props) => {
  const textColorSecondary = useColorModeValue('dracula.light.comment', 'dracula.comment');
  const textColor = useColorModeValue('dracula.light.foreground', 'dracula.foreground');
  const buttonBg = useColorModeValue('dracula.light.currentLine', 'dracula.currentLine');

  return (
    <Flex height="100%" direction="column" justify="center" align="center" p={4} gap={3}>
      {pageType.type === 'slack' ? (
        <VStack spacing={4} width="100%" align="center">
          <Button
            isDisabled={!isThreadPaneAvailable || (!isContentScriptLoaded && !isOptionsPage)}
            colorScheme="blue"
            leftIcon={<Text>⭐️</Text>}
            onClick={handleSummarizeSlack}
            isLoading={isCapturing}
            loadingText="Capturing thread">
            Summarize current page
          </Button>
          {!isOptionsPage && isContentScriptLoaded && (
            <HStack spacing={1}>
              <Text fontSize="xs" color={textColorSecondary}>
                Click
              </Text>
              <Flex h="24px" align="center" gap={2} bg={buttonBg} px={3} borderRadius="md" boxShadow="lg">
                <Text fontSize="xs">⭐️</Text>
                <Text fontSize="xs" color={textColor}>
                  Summarize
                </Text>
              </Flex>
              <Text fontSize="xs" color={textColorSecondary}>
                in any conversation
              </Text>
            </HStack>
          )}
        </VStack>
      ) : (
        <VStack spacing={3}>
          <Tooltip
            label={readabilityChecked && !isReadable ? "This page doesn't contain readable content" : ''}
            isDisabled={!readabilityChecked || isReadable}
            hasArrow
            placement="top"
            fontSize="xs">
            <Button
              onClick={handleCapturePage}
              colorScheme="blue"
              leftIcon={<Text>⭐️</Text>}
              isLoading={isCapturing}
              loadingText="Capturing page"
              isDisabled={isOptionsPage || (readabilityChecked && !isReadable) || (!isContentScriptLoaded && domReady)}>
              Summarize current page
            </Button>
          </Tooltip>
          {pageType.url && !isOptionsPage && (
            <Text
              maxW="300px"
              fontSize="xs"
              color={textColorSecondary}
              textAlign="center"
              title={pageType.url}
              isTruncated>
              {pageType.url}
            </Text>
          )}
        </VStack>
      )}
      {!isContentScriptLoaded && !isCapturing && !isOptionsPage && !isPageLoading && !isRestrictedDomain && (
        <Text fontSize="xs" color={textColorSecondary} textAlign="center">
          Please{' '}
          <Button onClick={handleReloadPage} size="xs">
            reload
          </Button>{' '}
          the page to enable summarization
        </Text>
      )}
    </Flex>
  );
};

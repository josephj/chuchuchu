import { useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';

export const ColorModeManager = () => {
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    // Sync color mode with storage
    const syncColorMode = () => {
      chrome.storage.local.set({ colorMode });
    };

    syncColorMode();

    // Listen for color mode changes from other contexts
    chrome.storage.onChanged.addListener(changes => {
      if (changes.colorMode && changes.colorMode.newValue !== colorMode) {
        setColorMode(changes.colorMode.newValue);
      }
    });
  }, [colorMode, setColorMode]);

  return null;
};

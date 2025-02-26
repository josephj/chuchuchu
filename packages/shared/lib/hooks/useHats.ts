import { useState, useEffect, useCallback } from 'react';
import type { Hat } from '@extension/storage';
import { hatStorage } from '@extension/storage';

export const useHats = () => {
  const [hats, setHats] = useState<Hat[]>([]);

  const loadHats = useCallback(async () => {
    const list = await hatStorage.getHatList();
    const fullHats = await Promise.all(list.map(item => hatStorage.getHat(item.id)));
    const filteredHats = fullHats.filter((hat): hat is Hat => hat !== null);
    setHats(filteredHats);
  }, []);

  const handleStorageChange = useCallback(
    (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const hatListChange = changes[hatStorage.HAT_LIST_KEY];
      if (hatListChange) {
        loadHats();
      }
    },
    [loadHats],
  );

  useEffect(() => {
    loadHats();

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadHats, handleStorageChange]);

  return hats;
};

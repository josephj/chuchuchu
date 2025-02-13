import { useState, useEffect } from 'react';
import type { Hat } from '@extension/storage/lib/impl/hatStorage';
import { hatStorage } from '@extension/storage';

export const useHats = () => {
  const [hats, setHats] = useState<Hat[]>([]);

  useEffect(() => {
    const loadHats = async () => {
      const list = await hatStorage.getHatList();
      const fullHats = await Promise.all(list.map(item => hatStorage.getHat(item.id)));
      const filteredHats = fullHats.filter((hat): hat is Hat => hat !== null);
      setHats(filteredHats);
    };

    loadHats();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const hatListChange = changes[hatStorage.HAT_LIST_KEY];
      if (hatListChange) {
        loadHats();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return hats;
};

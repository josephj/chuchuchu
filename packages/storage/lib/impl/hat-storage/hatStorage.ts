import { StorageEnum } from '../../base/enums';
import { createStorage } from '../../base/base';
import type { BaseStorage } from '../../base/types';
import type { HatListItem, Hat } from './types';
import { defaultHats } from './default-hats';
import { nanoid } from 'nanoid';

type HatStorageType = BaseStorage<HatListItem[]> & {
  getHatList: () => Promise<HatListItem[]>;
  getHat: (id: string) => Promise<Hat | null>;
  setHat: (hat: Hat) => Promise<void>;
  setHatList: (list: HatListItem[]) => Promise<void>;
  deleteHat: (id: string) => Promise<void>;
  initializeDefaultHats: () => Promise<void>;
  HAT_LIST_KEY: string;
};

export const HAT_LIST_KEY = 'hat_list';
export const HAT_DATA_PREFIX = 'hat_data_';

const storage = createStorage<HatListItem[]>(HAT_LIST_KEY, [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

const generateHatId = (label: string) => {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  const uniqueSuffix = nanoid(8);
  return ['hat', slug, uniqueSuffix].filter(Boolean).join('_');
};

export const hatStorage: HatStorageType = {
  ...storage,
  getHatList: async () => {
    const list = await storage.get();
    if (!list.length) {
      await hatStorage.initializeDefaultHats();
      return await storage.get();
    }

    return list;
  },
  setHatList: async (list: HatListItem[]) => {
    await storage.set(list);
  },

  async getHat(id: string): Promise<Hat | null> {
    const key = `${HAT_DATA_PREFIX}${id}`;
    const result = await chrome.storage.sync.get(key);
    return result[key] || null;
  },

  async setHat(hat: Hat): Promise<void> {
    const key = `${HAT_DATA_PREFIX}${hat.id}`;
    await chrome.storage.sync.set({ [key]: hat });
  },

  async deleteHat(id: string): Promise<void> {
    const key = `${HAT_DATA_PREFIX}${id}`;
    await chrome.storage.sync.remove(key);
  },

  async initializeDefaultHats(): Promise<void> {
    const hatList = defaultHats.map(hat => ({
      id: generateHatId(hat.label),
      ...hat,
    }));

    await Promise.all(hatList.map(hat => hatStorage.setHat({ ...hat })));
    await hatStorage.setHatList(hatList);
  },

  get HAT_LIST_KEY(): string {
    return HAT_LIST_KEY;
  },
};

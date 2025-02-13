import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

export type HatListItem = {
  id: string;
  label: string;
  language: string;
};

export type Hat = {
  id: string;
  label: string;
  language: string;
  prompt: string;
  model?: string;
  temperature?: number;
  urlPatterns?: string[];
};

type HatStorageType = BaseStorage<HatListItem[]> & {
  getHatList: () => Promise<HatListItem[]>;
  getHat: (id: string) => Promise<Hat | null>;
  setHat: (hat: Hat) => Promise<void>;
  setHatList: (list: HatListItem[]) => Promise<void>;
  deleteHat: (id: string) => Promise<void>;
  HAT_LIST_KEY: string;
};

export const HAT_LIST_KEY = 'hat_list';
export const HAT_DATA_PREFIX = 'hat_data_';

const storage = createStorage<HatListItem[]>(HAT_LIST_KEY, [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export const hatStorage: HatStorageType = {
  ...storage,
  getHatList: async () => {
    return await storage.get();
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

  get HAT_LIST_KEY(): string {
    return HAT_LIST_KEY;
  },
};

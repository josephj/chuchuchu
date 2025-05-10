import type { BaseStorage } from '../../base/types';

export type HatListItem = {
  id: string;
  label: string;
  language?: string;
  position?: number;
};

export type Hat = {
  id: string;
  alias?: string;
  label: string;
  language?: string;
  model: string;
  prompt: string;
  temperature: number;
  urlPattern?: string;
  position?: number;
};

export type HatStorageType = BaseStorage<HatListItem[]> & {
  getHatList: () => Promise<HatListItem[]>;
  getHat: (id: string) => Promise<Hat | null>;
  setHat: (hat: Hat) => Promise<void>;
  setHatList: (list: HatListItem[]) => Promise<void>;
  deleteHat: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  HAT_LIST_KEY: string;
  HAT_DATA_PREFIX: string;
};

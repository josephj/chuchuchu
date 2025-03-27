import { StorageEnum } from '../../base/enums';
import { createStorage } from '../../base/base';
import type { BaseStorage } from '../../base/types';
import type { HatListItem, Hat } from './types';
import { defaultHats } from './default-hats';
import { generateHatId } from './utils';

type HatStorageType = BaseStorage<HatListItem[]> & {
  getHatList: () => Promise<HatListItem[]>;
  getHat: (id: string) => Promise<Hat | null>;
  addHat: (hat: Hat) => Promise<void>;
  setHat: (hat: Hat) => Promise<void>;
  setHatList: (list: HatListItem[]) => Promise<void>;
  deleteHat: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  HAT_LIST_KEY: string;
  HAT_PREFIX: string;
};

export const HAT_LIST_KEY = 'hat_list';
export const HAT_PREFIX = 'hat_data_';
export const IS_INITIAL_STATE_KEY = 'is_initial_state';

const hatListStorage = createStorage<HatListItem[]>(HAT_LIST_KEY, [], {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

const initialStateStorage = createStorage<boolean>(IS_INITIAL_STATE_KEY, true, {
  storageEnum: StorageEnum.Sync,
  liveUpdate: true,
});

export const hatStorage: HatStorageType = {
  ...hatListStorage,

  getHatList: async () => {
    const isInitialState = await initialStateStorage.get();
    if (isInitialState) {
      return [...defaultHats];
    }

    const list = await hatListStorage.get();
    return list;
  },

  setHatList: async (list: HatListItem[]) => {
    await Promise.all([hatListStorage.set(list), initialStateStorage.set(false)]);
  },

  async getHat(id: string): Promise<Hat | null> {
    const isInitialState = await initialStateStorage.get();
    if (isInitialState) {
      return defaultHats.find(hat => hat.id === id) || null;
    }

    const result = await chrome.storage.sync.get(id);
    return result[id] || null;
  },

  /**
   * Adds a new hat to storage. If in initial state, it will:
   * 1. Clone all default hats with newly generated IDs
   * 2. Add the new hat
   * 3. Update the hat list with both default and new hats
   * 4. Exit initial state
   *
   * If not in initial state, it will simply:
   * 1. Add the new hat to storage
   * 2. Append the hat to the existing hat list
   */
  async addHat(hat: Hat): Promise<void> {
    const isInitialState = await initialStateStorage.get();
    if (isInitialState) {
      // Clone all default hats and add the new hat
      await Promise.all([
        ...defaultHats.map(defaultHat => {
          const id = generateHatId(defaultHat.label);
          return chrome.storage.sync.set({
            [id]: { ...defaultHat, id },
          });
        }),
        chrome.storage.sync.set({ [hat.id]: hat }),
        hatListStorage.set([
          ...defaultHats.map(defaultHat => ({
            id: generateHatId(defaultHat.label),
            label: defaultHat.label,
          })),
          { id: hat.id, label: hat.label },
        ]),
        initialStateStorage.set(false),
      ]);
    } else {
      // Just add the new hat
      const currentList = await hatListStorage.get();
      await Promise.all([
        chrome.storage.sync.set({ [hat.id]: hat }),
        hatListStorage.set([...currentList, { id: hat.id, label: hat.label }]),
      ]);
    }
  },

  /**
   * Updates an existing hat. If in initial state, it will:
   * 1. Clone all default hats with newly generated IDs
   * 2. Replace the matching default hat with the updated values
   * 3. Update the hat list with all hats
   * 4. Exit initial state
   *
   * If not in initial state, it will:
   * 1. Update the hat in storage
   * 2. Update the hat's entry in the hat list
   */
  async setHat(hat: Hat): Promise<void> {
    const isInitialState = await initialStateStorage.get();

    if (isInitialState) {
      // Clone all default hats, replacing the modified one with new values
      const nextHats = defaultHats.map(defaultHat => {
        const id = generateHatId(defaultHat.label);
        return defaultHat.id === hat.id ? { ...hat, id: generateHatId(hat.label) } : { ...defaultHat, id };
      });

      // Get the first hat's ID to set as selected
      const firstHatId = nextHats[0]?.id;

      await Promise.all([
        ...nextHats.map(nextHat =>
          chrome.storage.sync.set({
            [nextHat.id]: nextHat,
          }),
        ),
        hatListStorage.set(nextHats.map(h => ({ id: h.id, label: h.label }))),
        initialStateStorage.set(false),
        // Set the first hat as selected
        firstHatId ? chrome.storage.sync.set({ selectedHat: firstHatId }) : Promise.resolve(),
      ]);
    } else {
      // Just update the existing hat
      const currentList = await hatListStorage.get();
      const nextList = currentList.map(item => (item.id === hat.id ? { id: hat.id, label: hat.label } : item));

      await Promise.all([chrome.storage.sync.set({ [hat.id]: hat }), hatListStorage.set(nextList)]);
    }
  },

  /**
   * Deletes a hat from storage. If in initial state, it will:
   * 1. Clone all default hats except the deleted one
   * 2. Generate new IDs for remaining hats
   * 3. Update the hat list with remaining hats
   * 4. Exit initial state
   *
   * If not in initial state, it will:
   * 1. Remove the hat from storage
   * 2. Remove the hat from the hat list
   */
  async deleteHat(id: string): Promise<void> {
    const isInitialState = await initialStateStorage.get();

    if (isInitialState) {
      // Clone all default hats except the deleted one
      const nextHats = defaultHats.filter(defaultHat => defaultHat.id !== id);

      await Promise.all([
        ...nextHats.map(hat => {
          const newId = generateHatId(hat.label);
          return chrome.storage.sync.set({
            [newId]: { ...hat, id: newId },
          });
        }),
        hatListStorage.set(
          nextHats.map(h => ({
            id: generateHatId(h.label),
            label: h.label,
          })),
        ),
        initialStateStorage.set(false),
      ]);
    } else {
      // Remove the hat and update the list
      const currentList = await hatListStorage.get();
      const nextList = currentList.filter(item => item.id !== id);

      await Promise.all([chrome.storage.sync.remove(id), hatListStorage.set(nextList)]);
    }
  },

  /**
   * Resets the storage to initial state by:
   * 1. Removing all hat data from storage
   * 2. Clearing the hat list
   * 3. Setting initial state flag to true
   */
  async reset(): Promise<void> {
    const allKeys = await chrome.storage.sync.get(null);
    const hatDataKeys = Object.keys(allKeys).filter(key => key.startsWith(HAT_PREFIX));
    if (hatDataKeys.length > 0) {
      await chrome.storage.sync.remove(hatDataKeys);
    }

    await Promise.all([
      ...defaultHats.map(defaultHat => {
        const id = generateHatId(defaultHat.label);
        return chrome.storage.sync.set({
          [id]: { ...defaultHat, id },
        });
      }),
      hatListStorage.set(
        defaultHats.map(defaultHat => ({
          id: generateHatId(defaultHat.label),
          label: defaultHat.label,
        })),
      ),
      initialStateStorage.set(true),
    ]);
  },

  get HAT_LIST_KEY(): string {
    return HAT_LIST_KEY;
  },

  get HAT_PREFIX(): string {
    return HAT_PREFIX;
  },
};

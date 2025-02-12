import type { Hat, HatList } from './types';

export const HAT_LIST_KEY = 'hat_list';
export const HAT_DATA_PREFIX = 'hat_data_';

export const storage = {
  HAT_LIST_KEY,
  HAT_DATA_PREFIX,

  // Hat List operations
  async getHatList(): Promise<HatList> {
    const result = await chrome.storage.sync.get(HAT_LIST_KEY);
    return result[HAT_LIST_KEY] || [];
  },

  async setHatList(list: HatList): Promise<void> {
    await chrome.storage.sync.set({ [HAT_LIST_KEY]: list });
  },

  // Individual Hat operations
  async getHat(id: string): Promise<Hat | null> {
    const key = HAT_DATA_PREFIX + id;
    const result = await chrome.storage.sync.get(key);
    return result[key] || null;
  },

  async setHat(hat: Hat): Promise<void> {
    const key = HAT_DATA_PREFIX + hat.id;
    await chrome.storage.sync.set({ [key]: hat });
  },

  async deleteHat(id: string): Promise<void> {
    const key = HAT_DATA_PREFIX + id;
    await chrome.storage.sync.remove(key);
  },

  // Migration helper
  async migrateFromOldStorage(): Promise<void> {
    try {
      // Get old storage data
      const result = await chrome.storage.sync.get('hats');
      const oldHats: Hat[] = result.hats || [];

      if (oldHats.length === 0) return;

      // Create new hat list
      const hatList: HatList = oldHats.map(hat => ({
        id: hat.id,
        label: hat.label,
        alias: hat.alias,
        urlPattern: hat.urlPattern,
        model: hat.model,
        language: hat.language,
      }));

      // Store hat list
      await storage.setHatList(hatList);

      // Store individual hats
      await Promise.all(oldHats.map(hat => storage.setHat(hat)));

      // Remove old storage
      await chrome.storage.sync.remove('hats');

      console.log('[Storage] Migration completed successfully');
    } catch (error) {
      console.error('[Storage] Migration failed:', error);
      throw error;
    }
  },
};

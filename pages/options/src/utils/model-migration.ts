import { hatStorage } from '@extension/storage';
import type { Hat } from '../types';

export const migrateHats = async () => {
  const hatList = await hatStorage.getHatList();
  const hats = await Promise.all(hatList.map(item => hatStorage.getHat(item.id)));
  const updatedHats = hats
    .filter((hat): hat is Hat => hat !== null)
    .map(hat => {
      let model = hat.model;

      // Migrate deprecated models
      if (model === 'deepseek-r1-distill-qwen-32b') {
        model = 'qwen-qwq-32b';
      }
      if (model === 'qwen-qwq-32b') {
        model = 'qwen/qwen3-32b';
      }

      return {
        ...hat,
        model,
      };
    });

  const hasChanges = hats.some((hat, index) => hat && updatedHats[index] && hat.model !== updatedHats[index].model);

  if (hasChanges) {
    await Promise.all(updatedHats.map(hat => hatStorage.setHat(hat)));
  }
  return hasChanges;
};

export const runModelMigration = migrateHats;

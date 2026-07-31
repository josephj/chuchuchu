import { hatStorage } from '@extension/storage';
import type { Hat } from '../types';

// Maps Groq model IDs that have been decommissioned to their live replacement.
// See https://console.groq.com/docs/deprecations
const DEPRECATED_MODEL_MAP: Record<string, string> = {
  'deepseek-r1-distill-qwen-32b': 'openai/gpt-oss-120b',
  'deepseek-r1-distill-llama-70b': 'openai/gpt-oss-120b',
  'qwen-qwq-32b': 'openai/gpt-oss-120b',
  'qwen/qwen3-32b': 'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'qwen/qwen3.6-27b',
  'meta-llama/llama-4-maverick-17b-128e-instruct': 'openai/gpt-oss-120b',
  'moonshotai/kimi-k2-instruct': 'openai/gpt-oss-120b',
  'moonshotai/kimi-k2-instruct-0905': 'openai/gpt-oss-120b',
};

export const migrateHats = async () => {
  const hatList = await hatStorage.getHatList();
  const hats = await Promise.all(hatList.map(item => hatStorage.getHat(item.id)));
  const updatedHats = hats
    .filter((hat): hat is Hat => hat !== null)
    .map(hat => ({
      ...hat,
      model: DEPRECATED_MODEL_MAP[hat.model] ?? hat.model,
    }));

  const hasChanges = hats.some((hat, index) => hat && updatedHats[index] && hat.model !== updatedHats[index].model);

  if (hasChanges) {
    await Promise.all(updatedHats.map(hat => hatStorage.setHat(hat)));
  }
  return hasChanges;
};

export const runModelMigration = migrateHats;

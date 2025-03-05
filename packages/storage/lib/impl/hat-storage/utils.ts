import { nanoid } from 'nanoid';
import { HAT_PREFIX } from './hatStorage';

export const generateHatId = (label: string) => {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  const uniqueSuffix = nanoid(8);
  return [HAT_PREFIX, slug, uniqueSuffix].filter(Boolean).join('_');
};

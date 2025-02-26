import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { glob } from 'glob';

const copyMdFiles = async () => {
  const mdFiles = await glob('lib/**/*.md');
  mdFiles.forEach(file => {
    const destPath = join('dist', file);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(file, destPath);
  });
};

/**
 * @type { import('esbuild').BuildOptions }
 */
const buildOptions = {
  entryPoints: ['./index.ts', './lib/**/*.ts'],
  tsconfig: './tsconfig.json',
  bundle: false,
  target: 'es6',
  outdir: './dist',
  sourcemap: true,
  loader: {
    '.md': 'text',
  },
};

await esbuild.build(buildOptions);
await copyMdFiles();

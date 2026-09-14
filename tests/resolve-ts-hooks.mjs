import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try {
      const url = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(specifier + '.ts', context);
    } catch { /* fall through */ }
  }
  return next(specifier, context);
}

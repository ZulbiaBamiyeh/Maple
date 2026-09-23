/**
 * The source uses extensionless imports, the way bundlers expect. Node's loader
 * does not, so this hook adds the `.ts` back on for the test run. Node strips
 * the types itself.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./resolve-ts-hooks.mjs', pathToFileURL('./tests/'));

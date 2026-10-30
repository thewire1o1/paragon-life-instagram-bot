import {copyFile, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const serverBundle = resolve('dist/server/index.js');
const pagesWorker = resolve('dist/client/_worker.js');

await copyFile(serverBundle, pagesWorker);

// The source map remains useful in Oxygen but is not included in the Pages
// output directory. Remove the dangling reference from the Pages copy.
const workerSource = await readFile(pagesWorker, 'utf8');
await writeFile(
  pagesWorker,
  workerSource.replace(/\n\/\/# sourceMappingURL=index\.js\.map\s*$/, '\n'),
);

console.log('Prepared dist/client for Cloudflare Pages advanced mode.');

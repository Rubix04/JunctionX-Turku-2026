// The app's mock mode reads two content files that are written in server/content.
// The server copy is the one to edit; this script copies it into the app.
//
//   npm run content:sync    copy server/content -> src/services/mock
//   npm run content:check   fail if the copies differ (part of `npm run lint`)

import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverContent = join(clientDir, '..', 'server', 'content');
const mockDir = join(clientDir, 'src', 'services', 'mock');
const files = ['knowledge-base.json', 'seasonal-alerts.json'];

const check = process.argv.includes('--check');
const outOfDate = [];

for (const file of files) {
  const source = join(serverContent, file);
  const target = join(mockDir, file);
  if (readFileSync(source, 'utf8') === readFileSync(target, 'utf8')) continue;
  if (check) {
    outOfDate.push(file);
  } else {
    copyFileSync(source, target);
    console.log(`Copied ${file}`);
  }
}

if (outOfDate.length) {
  console.error(
    `Out of date with server/content: ${outOfDate.join(', ')}.\nEdit server/content, then run \`npm run content:sync\`.`,
  );
  process.exit(1);
}
if (check) console.log('Mock content matches server/content.');

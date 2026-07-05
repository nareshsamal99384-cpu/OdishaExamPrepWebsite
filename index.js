// Diagnostic entrypoint for index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const rootLogPath = path.resolve(__dirname, 'build', 'index-startup-log.json');
  fs.writeFileSync(rootLogPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    filename: __filename,
    message: "Root index.js executed successfully."
  }, null, 2), 'utf8');
} catch (err) {
  // Ignore
}

import "./build/server.js";

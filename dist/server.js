// Redirection wrapper for Passenger configured to dist/server.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const startupLogPath = path.resolve(__dirname, '..', 'build', 'dist-startup-log.json');
  fs.writeFileSync(startupLogPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    filename: __filename,
    message: "Stale entrypoint dist/server.js executed and redirected to build/server.js successfully."
  }, null, 2), 'utf8');
} catch (err) {
  // Ignore
}

import "../build/server.js";

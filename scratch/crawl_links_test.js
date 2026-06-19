import { spawn } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = '4568';
const serverProcess = spawn('node', ['dist/server.js'], {
  env: {
    ...process.env,
    PORT,
    NODE_ENV: 'production'
  }
});

let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});
serverProcess.stderr.on('data', (data) => {
  console.error('[Server Error Output]:', data.toString());
});

// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 3000));
console.log('Server logs:', serverOutput);

const baseUrl = `http://localhost:${PORT}`;

async function crawlAndValidate() {
  const visited = new Set();
  const queue = ['/'];
  let failed = false;

  console.log('\n--- Link Crawl and Validation Started ---');

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (visited.has(currentPath)) continue;
    visited.add(currentPath);

    const fullUrl = `${baseUrl}${currentPath}`;
    console.log(`Crawling: ${currentPath}`);

    try {
      const res = await fetch(fullUrl);
      if (res.status !== 200) {
        console.error(`[-] Broken link found! Path ${currentPath} returned HTTP status ${res.status}`);
        failed = true;
        continue;
      }

      const html = await res.text();

      // Extract all href values from <a> tags
      const hrefRegex = /href="([^"]+)"/g;
      let match;
      while ((match = hrefRegex.exec(html)) !== null) {
        let href = match[1];

        // We only care about internal links
        if (
          href.startsWith('/') &&
          !href.startsWith('//') &&
          !href.includes('.') && // Exclude assets like .png, .ico, etc.
          !href.startsWith('/api') &&
          !href.startsWith('/chat')
        ) {
          // Normalize (strip query params and hashes)
          const cleanPath = href.split('?')[0].split('#')[0];
          if (cleanPath && !visited.has(cleanPath) && !queue.includes(cleanPath)) {
            queue.push(cleanPath);
          }
        }
      }

    } catch (err) {
      console.error(`[-] Error fetching ${currentPath}:`, err);
      failed = true;
    }
  }

  console.log('\n--- Crawl Results ---');
  console.log(`Total internal pages crawled: ${visited.size}`);
  console.log('Pages crawled successfully:', Array.from(visited));

  if (failed) {
    console.error('\n[-] Crawl Validation FAILED. Found broken internal links.');
    process.exit(1);
  } else {
    console.log('\n[+] Crawl Validation SUCCESSFUL! All internal links resolved correctly.');
    process.exit(0);
  }
}

try {
  await crawlAndValidate();
} finally {
  serverProcess.kill();
  console.log('Server process terminated.');
}

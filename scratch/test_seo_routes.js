import { spawn } from 'child_process';
import fetch from 'node-fetch'; // or use native fetch since Node 18+ has it
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = '4567';
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

const url = `http://localhost:${PORT}`;

const testCases = [
  {
    path: '/',
    title: 'OdishaExamPrep - Best Platform for Odisha Exam Preparation',
    desc: 'Excel in OPSC, OSSC, OSSSC, and other Odisha government competitive exams. Practice with expert-crafted mock tests',
    hasSchema: true
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | OdishaExamPrep',
    desc: 'Read the Privacy Policy of OdishaExamPrep',
    hasSchema: false
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | OdishaExamPrep',
    desc: 'Read the Terms of Service for OdishaExamPrep',
    hasSchema: false
  },
  {
    path: '/refund-policy',
    title: 'Refund & Cancellation Policy | OdishaExamPrep',
    desc: 'Read the Refund & Cancellation Policy of OdishaExamPrep',
    hasSchema: false
  },
  {
    path: '/admin-login',
    title: 'Admin Login | OdishaExamPrep',
    desc: 'Secure portal for OdishaExamPrep administrators',
    hasSchema: false
  }
];

let failed = false;

try {
  for (const tc of testCases) {
    console.log(`\nTesting route: ${tc.path}`);
    const res = await fetch(`${url}${tc.path}`);
    if (res.status !== 200) {
      console.error(`[-] Route ${tc.path} returned status ${res.status}`);
      failed = true;
      continue;
    }

    const html = await res.text();

    // Verify Title
    if (!html.includes(`<title>${tc.title}</title>`)) {
      console.error(`[-] Missing or incorrect title tag on ${tc.path}`);
      failed = true;
    } else {
      console.log(`[+] Title verified: "${tc.title}"`);
    }

    // Verify Description
    if (!html.includes(tc.desc)) {
      console.error(`[-] Missing or incorrect description on ${tc.path}`);
      failed = true;
    } else {
      console.log(`[+] Description verified snippet: "${tc.desc.substring(0, 40)}..."`);
    }

    // Verify canonical url format
    if (!html.includes(`<link rel="canonical" href="http://localhost:${PORT}${tc.path}" />`)) {
      console.error(`[-] Missing or incorrect canonical link on ${tc.path}`);
      failed = true;
    } else {
      console.log(`[+] Canonical link verified`);
    }

    // Verify Schema.org Structured Data
    if (tc.hasSchema && !html.includes('id="json-ld-schema"')) {
      console.error(`[-] Missing Schema.org JSON-LD structured data on ${tc.path}`);
      failed = true;
    } else if (tc.hasSchema) {
      console.log(`[+] JSON-LD Structured Data verified`);
    }

    // Verify icon links are present
    const iconTags = [
      'rel="icon" type="image/svg+xml" href="/favicon.svg"',
      'rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"',
      'rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"',
      'rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"',
      'rel="shortcut icon" href="/favicon.ico"',
      'rel="manifest" href="/site.webmanifest"'
    ];

    for (const tag of iconTags) {
      if (!html.includes(tag)) {
        console.error(`[-] Missing icon/manifest tag: ${tag}`);
        failed = true;
      }
    }
    console.log(`[+] Icon links verified`);
  }

  // Test favicon.ico serving
  const icoRes = await fetch(`${url}/favicon.ico`);
  if (icoRes.status === 200) {
    console.log(`[+] /favicon.ico served successfully`);
  } else {
    console.error(`[-] Failed to fetch /favicon.ico`);
    failed = true;
  }

  // Test site.webmanifest serving
  const manifestRes = await fetch(`${url}/site.webmanifest`);
  if (manifestRes.status === 200) {
    const manifestJson = await manifestRes.json();
    if (manifestJson.name === 'OdishaExamPrep') {
      console.log(`[+] /site.webmanifest served and verified successfully`);
    } else {
      console.error(`[-] Invalid manifest content`);
      failed = true;
    }
  } else {
    console.error(`[-] Failed to fetch /site.webmanifest`);
    failed = true;
  }

} catch (err) {
  console.error('Test run failed with error:', err);
  failed = true;
} finally {
  serverProcess.kill();
  console.log('\nServer process terminated.');
}

if (failed) {
  console.error('\n[-] SEO Verification FAILED.');
  process.exit(1);
} else {
  console.log('\n[+] SEO Verification SUCCESSFUL!');
  process.exit(0);
}

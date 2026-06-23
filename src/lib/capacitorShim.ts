import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Browser } from '@capacitor/browser';

// Capacitor Mobile Environment Shim
// Intercepts and redirects relative API calls when running inside the native Capacitor app wrapper.

const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

if (isCapacitor) {
  console.log('[Mobile Shim] Running inside native app wrapper. Initializing plugins.');
  
  // Configure Status Bar
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#8a1c36' }).catch(() => {});

  // Handle external links to open in browser instead of in-app webview
  const originalOpen = window.open;
  window.open = function(url?: string | URL, target?: string, features?: string): Window | null {
    const urlStr = url ? url.toString() : '';
    const isPdf = urlStr.toLowerCase().endsWith('.pdf');
    const isExternal = (urlStr.startsWith('http') || urlStr.startsWith('https')) && !urlStr.includes('odishaexamprep.in');

    if (url && (isExternal || isPdf)) {
      Browser.open({ url: urlStr }).catch(() => {
        originalOpen(url, target, features);
      });
      return null;
    }
    return originalOpen(url as any, target, features);
  };

  const originalFetch = window.fetch;
  
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let urlString = '';
    
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input && typeof input === 'object' && 'url' in input) {
      urlString = (input as any).url;
    }

    // Check if the URL is a relative path starting with /api/ or just api/
    // or if it's hitting the localhost origin for an api call
    const isApiCall = urlString.startsWith('/api/') ||
                      urlString.startsWith('api/') ||
                      urlString.includes('localhost/api/') ||
                      urlString.includes('localhost:3000/api/') ||
                      urlString.includes('localhost:5173/api/');

    if (isApiCall) {
      // Extract the path after /api/
      const apiMatch = urlString.match(/\/api\/(.*)/) || urlString.match(/^api\/(.*)/);
      const apiPath = apiMatch ? apiMatch[1] : urlString.replace(/.*\/api\//, '');
      
      const redirectedUrl = `https://www.odishaexamprep.in/api/${apiPath}`;
      console.log(`[Mobile Shim] Redirecting API call: ${urlString} -> ${redirectedUrl}`);

      // If the input was a Request object, we must clone it or extract its properties
      if (input instanceof Request) {
        const { method, headers, body, mode, credentials, cache, redirect, referrer, integrity, keepalive, signal } = input;
        const newInit: RequestInit = {
          method,
          headers,
          body,
          mode,
          credentials,
          cache,
          redirect,
          referrer,
          integrity,
          keepalive,
          signal,
          ...init
        };
        return originalFetch(redirectedUrl, newInit);
      }

      return originalFetch(redirectedUrl, init);
    }
    
    return originalFetch(input, init);
  };
} else {
  console.log('[Mobile Shim] Running in standard browser environment.');
}

export { isCapacitor };

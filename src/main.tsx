import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import LoadingPortal from './components/LoadingPortal';

// Handle dynamic import (chunk) loading failures gracefully
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite Preload Error] Failed to fetch dynamic asset. Reloading to apply update...');
  const lastReload = sessionStorage.getItem('oep_last_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload) > 15000) {
    sessionStorage.setItem('oep_last_chunk_reload', now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<LoadingPortal />}>
          <App />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

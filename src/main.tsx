import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import LoadingPortal from './components/LoadingPortal';

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

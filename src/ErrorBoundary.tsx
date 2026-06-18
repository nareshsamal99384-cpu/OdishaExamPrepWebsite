import React, { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    
    // Check if it is a chunk load error
    const message = error?.message || '';
    const isChunkLoadFailed = message.includes('Failed to fetch') ||
                              message.includes('dynamically imported module') ||
                              message.includes('loading chunk');
    
    if (isChunkLoadFailed) {
      const now = Date.now();
      const lastReload = sessionStorage.getItem('oep_last_chunk_reload');
      // If we haven't reloaded in the last 15 seconds, trigger a reload
      if (!lastReload || now - parseInt(lastReload) > 15000) {
        sessionStorage.setItem('oep_last_chunk_reload', now.toString());
        console.log('[ErrorBoundary] Chunk load failed. Reloading page to fetch latest assets...');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const message = error?.message || '';
      const isChunkLoadFailed = message.includes('Failed to fetch') ||
                                message.includes('dynamically imported module') ||
                                message.includes('loading chunk');
      
      const lastReload = sessionStorage.getItem('oep_last_chunk_reload');
      const justReloaded = lastReload && (Date.now() - parseInt(lastReload) < 5000);

      if (isChunkLoadFailed && !justReloaded) {
        // Render a premium "Updating website to the latest version..." screen while page is reloading
        return (
          <div className="fixed inset-0 bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 font-sans z-[99999]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.1)_0%,transparent_70%)] pointer-events-none" />
            <div className="text-center space-y-6 max-w-sm">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-indigo-400 border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">Updating Application</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  We are updating the site to the latest version and refreshing your session. Please wait a moment...
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="fixed inset-0 bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 font-sans overflow-y-auto z-[99999]">
          {/* Ambient lighting */}
          <div className="absolute top-0 left-1/4 w-[250px] h-[250px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center my-8">
            {/* Red Alert icon */}
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgba(244,63,94,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
              {isChunkLoadFailed 
                ? "A connection issue or application update occurred. We couldn't load some components." 
                : "An unexpected error occurred while loading this page."}
            </p>

            <button
              onClick={() => {
                sessionStorage.removeItem('oep_last_chunk_reload');
                window.location.reload();
              }}
              className="w-full py-3.5 px-6 rounded-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-[0_8px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_45px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] cursor-pointer"
            >
              Refresh & Try Again
            </button>

            {/* Support info */}
            <div className="mt-6 text-xs text-slate-500">
              If the problem persists, please contact support at <strong className="text-indigo-400 font-semibold select-all">support@odishaexamprep.com</strong>
            </div>

            {/* Error Details Accordion */}
            <details className="mt-6 text-left border-t border-white/[0.06] pt-4 group">
              <summary className="text-xs font-semibold text-slate-500 hover:text-slate-350 cursor-pointer select-none outline-none flex items-center justify-between">
                <span>View technical details</span>
                <span className="transition-transform group-open:rotate-180">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="mt-3 bg-black/40 rounded-xl p-4 overflow-x-auto text-[10px] font-mono text-slate-400 max-h-40 no-scrollbar border border-white/[0.04] select-text">
                <div className="font-bold text-rose-400 mb-1">{error?.name}: {error?.message}</div>
                <div className="whitespace-pre">{error?.stack}</div>
              </div>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

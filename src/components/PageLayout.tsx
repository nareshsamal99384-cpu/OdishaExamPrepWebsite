import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  backTo?: { path: string; label: string };
}

export default function PageLayout({ children, className, backTo }: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-[#F8FAFC] font-sans', className)}>
      {backTo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <Link
            to={backTo.path}
            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-bold bg-white/80 backdrop-blur px-4 py-2 rounded-xl transition-all shadow-sm border border-brand-100 hover:shadow-md text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> {backTo.label}
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}

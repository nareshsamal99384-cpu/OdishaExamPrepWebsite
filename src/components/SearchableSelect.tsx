import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { dropdown } from '../lib/animations';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
  searchPlaceholder = "Search..."
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset search when opened
  useEffect(() => {
    if (isOpen) setSearchQuery("");
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-white border border-slate-200 outline-none transition-all font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen ? "ring-2 ring-brand-500/20 border-brand-500" : "hover:border-slate-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          className || "px-3 py-2.5 rounded-lg text-sm"
        )}
      >
        <span className="truncate pr-4 text-left flex-1">
          {selectedOption ? selectedOption.label : <span className="text-slate-400 font-medium">{placeholder}</span>}
        </span>
        <ChevronDown className={cn("w-4 h-4 shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div {...dropdown}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-700 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar p-1.5 max-h-56">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-500">No results found</span>
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 text-sm md:text-base font-bold rounded-lg transition-colors text-left",
                      opt.value === value
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                      opt.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-600"
                    )}
                  >
                    <span className="truncate pr-4 flex-1">{opt.label}</span>
                    {opt.value === value && <Check className="w-5 h-5 text-brand-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

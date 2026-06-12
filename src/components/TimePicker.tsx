import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimePickerProps {
  value: string; // "HH:MM" in 24-hour format
  onChange: (value: string) => void;
  className?: string;
}

export default function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourContainerRef = useRef<HTMLDivElement>(null);
  const minuteContainerRef = useRef<HTMLDivElement>(null);

  // Parse "HH:MM" value
  const [hoursStr, minutesStr] = (value || "09:00").split(":");
  const hour24 = parseInt(hoursStr, 10) || 0;
  const minute = parseInt(minutesStr, 10) || 0;

  // Convert to 12-hour format
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  // Format display value
  const displayValue = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Center selected elements in scroll lists when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourContainerRef.current) {
          const selectedHour = hourContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedHour) {
            hourContainerRef.current.scrollTop = 
              (selectedHour as HTMLElement).offsetTop - 
              hourContainerRef.current.clientHeight / 2 + 
              (selectedHour as HTMLElement).clientHeight / 2;
          }
        }
        if (minuteContainerRef.current) {
          const selectedMinute = minuteContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedMinute) {
            minuteContainerRef.current.scrollTop = 
              (selectedMinute as HTMLElement).offsetTop - 
              minuteContainerRef.current.clientHeight / 2 + 
              (selectedMinute as HTMLElement).clientHeight / 2;
          }
        }
      }, 50);
    }
  }, [isOpen]);

  const updateTime = (h12: number, min: number, pm: string) => {
    let h24 = h12;
    if (pm === "PM" && h12 < 12) h24 += 12;
    if (pm === "AM" && h12 === 12) h24 = 0;
    onChange(`${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Target input display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-semibold flex items-center justify-between cursor-pointer select-none",
          isOpen && "ring-1 ring-indigo-500/40 border-indigo-500/50"
        )}
      >
        <span className="tabular-nums font-mono tracking-wide">{displayValue}</span>
        <Clock className={cn("w-3.5 h-3.5 text-slate-400 transition-colors duration-200", isOpen && "text-[#8a1c36]")} />
      </div>

      {/* Dropdown Pickers */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl p-3 z-50 flex flex-col space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Hours selection */}
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Hour</span>
              <div 
                ref={hourContainerRef}
                className="h-28 overflow-y-auto no-scrollbar space-y-0.5 pr-0.5"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                  const isSelected = hour12 === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => updateTime(h, minute, period)}
                      className={cn(
                        "w-full py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center",
                        isSelected 
                          ? "bg-[#8a1c36] text-white" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes selection */}
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Min</span>
              <div 
                ref={minuteContainerRef}
                className="h-28 overflow-y-auto no-scrollbar space-y-0.5 pr-0.5"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => {
                  const isSelected = minute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => updateTime(hour12, m, period)}
                      className={cn(
                        "w-full py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center",
                        isSelected 
                          ? "bg-[#8a1c36] text-white" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period selection */}
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Period</span>
              <div className="h-28 flex flex-col justify-center space-y-1.5 px-0.5">
                {["AM", "PM"].map((p) => {
                  const isSelected = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateTime(hour12, minute, p)}
                      className={cn(
                        "w-full py-2 text-xs font-black rounded-lg transition-colors cursor-pointer text-center",
                        isSelected 
                          ? "bg-[#8a1c36] text-white" 
                          : "text-slate-600 bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Action button to quickly close */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

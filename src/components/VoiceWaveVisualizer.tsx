import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';

interface VoiceWaveVisualizerProps {
  isActive: boolean;
  type?: 'listening' | 'speaking';
  bars?: number;
  className?: string;
  label?: string;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isActive,
  type = 'listening',
  bars = 36,
  className = '',
  label,
}) => {
  const [audioLevels, setAudioLevels] = useState<number[]>(() => new Array(bars).fill(3));
  const currentLevelsRef = useRef<number[]>(new Array(bars).fill(3));
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setAudioLevels(new Array(bars).fill(3));
      currentLevelsRef.current = new Array(bars).fill(3);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let stream: MediaStream | null = null;
    let isCleanedUp = false;

    const startRealMicAnalyzer = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCleanedUp) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.45; // fast real-time response to voice decibels

        microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevels = () => {
          if (!analyser || isCleanedUp) return;
          analyser.getByteFrequencyData(dataArray);

          // Calculate overall real microphone volume level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avgVolume = sum / dataArray.length;

          const targetLevels: number[] = [];
          const center = bars / 2;

          for (let i = 0; i < bars; i++) {
            const distanceFromCenter = Math.abs(i - center) / center;
            const bellFactor = Math.exp(-Math.pow(distanceFromCenter * 1.6, 2));

            const freqVal = dataArray[i % dataArray.length] || 0;
            const realEnergy = freqVal * 0.7 + avgVolume * 0.3;

            // Noise gate: if silent (realEnergy <= 6), keep small quiet dots (height 3)
            let targetHeight = 3;
            if (realEnergy > 6) {
              targetHeight = 3 + ((realEnergy - 6) / 180) * 21;
              targetHeight = Math.max(3, Math.min(24, targetHeight * bellFactor));
            }

            const prevHeight = currentLevelsRef.current[i] || 3;
            const smoothed = prevHeight + (targetHeight - prevHeight) * 0.35;
            targetLevels.push(smoothed);
          }

          currentLevelsRef.current = targetLevels;
          setAudioLevels([...targetLevels]);
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
      } catch (err) {
        console.warn('Real microphone audio analyzer error:', err);
        setAudioLevels(new Array(bars).fill(3));
      }
    };

    startRealMicAnalyzer();

    return () => {
      isCleanedUp = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isActive, type, bars]);

  if (!isActive) return null;

  return (
    <div className={cn('flex items-center justify-center overflow-hidden shrink-0', className)}>
      <div className="flex items-center gap-[3px] sm:gap-[4px] h-8 px-2 justify-center shrink-0">
        {audioLevels.map((height, index) => (
          <span
            key={index}
            className={cn(
              'w-[3px] sm:w-[4px] rounded-full transition-all duration-75 ease-out shrink-0',
              height > 4.5
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                : 'bg-slate-700/50'
            )}
            style={{
              height: `${height}px`,
            }}
          />
        ))}
      </div>
      {label && <span className="text-[11px] font-black uppercase tracking-wider ml-2 text-white/90 whitespace-nowrap shrink-0">{label}</span>}
    </div>
  );
};

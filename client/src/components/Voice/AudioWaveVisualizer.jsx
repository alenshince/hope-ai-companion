import React, { useEffect, useRef } from 'react';

/**
 * AudioWaveVisualizer:
 * Visual audio wave indicator displaying dynamic waveform animations when Hope is listening or speaking.
 * Supports compact mode (in headers / chat bars) and expanded mode (in hands-free voice overlay).
 */
export default function AudioWaveVisualizer({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking'
  size = 'md',    // 'sm' | 'md' | 'lg'
  className = ''
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (state === 'idle') {
        // Flat calm ambient line with subtle resting pulse
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 2;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // 3 resting dots
        const dotRadius = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(width / 2 + (i - 1) * 12, height / 2, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.fill();
        }
        return;
      }

      // Active state parameters
      let primaryColor, secondaryColor, amplitude, frequency, speed;

      if (state === 'listening') {
        // Crisp teal/cyan waves responding to human speech
        primaryColor = 'rgba(14, 165, 233, 0.85)';
        secondaryColor = 'rgba(56, 189, 248, 0.45)';
        amplitude = height * 0.38;
        frequency = 0.045;
        speed = 0.08;
      } else if (state === 'speaking') {
        // Harmonic indigo/purple waves representing Hope's voice
        primaryColor = 'rgba(99, 102, 241, 0.9)';
        secondaryColor = 'rgba(168, 85, 247, 0.45)';
        amplitude = height * 0.42;
        frequency = 0.055;
        speed = 0.12;
      } else if (state === 'processing') {
        // Fast shimmering golden/blue wave
        primaryColor = 'rgba(12, 135, 235, 0.8)';
        secondaryColor = 'rgba(234, 179, 8, 0.4)';
        amplitude = height * 0.25;
        frequency = 0.08;
        speed = 0.15;
      }

      phase += speed;

      // Draw secondary background wave
      ctx.beginPath();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * frequency + phase * 0.7) * (amplitude * 0.6);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw primary main wave
      ctx.beginPath();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      for (let x = 0; x < width; x++) {
        // Envelope factor so wave tapers neatly at edges
        const envelope = Math.sin((x / width) * Math.PI);
        const y = height / 2 + Math.sin(x * frequency + phase) * amplitude * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  const sizeClasses = {
    sm: 'w-24 h-6',
    md: 'w-48 h-12',
    lg: 'w-72 h-16'
  };

  const getStatusLabel = () => {
    switch (state) {
      case 'listening': return 'Hope is listening...';
      case 'speaking': return 'Hope is speaking...';
      case 'processing': return 'Thinking...';
      default: return 'Voice idle';
    }
  };

  const getStatusPillColor = () => {
    switch (state) {
      case 'listening': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'speaking': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Glow halo when active */}
        {state !== 'idle' && (
          <div className={`absolute inset-0 rounded-full blur-md opacity-35 ${
            state === 'listening' ? 'bg-sky-400' :
            state === 'speaking' ? 'bg-indigo-400' : 'bg-hope-400'
          }`} />
        )}
        <canvas
          ref={canvasRef}
          width={size === 'sm' ? 96 : size === 'lg' ? 288 : 192}
          height={size === 'sm' ? 24 : size === 'lg' ? 64 : 48}
          className={`${sizeClasses[size] || sizeClasses.md} relative z-10 transition-all`}
        />
      </div>

      {size !== 'sm' && (
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all ${getStatusPillColor()}`}>
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
}


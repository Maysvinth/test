import React, { useEffect, useRef } from 'react';

interface OrbVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color: string;
}

const OrbVisualizer: React.FC<OrbVisualizerProps> = ({ analyser, isActive, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dataArray: Uint8Array;
    if (analyser) {
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 - 10;
      const baseRadius = maxRadius * 0.4;

      ctx.clearRect(0, 0, width, height);

      let average = 0;

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        average = sum / dataArray.length;
      }

      // Dynamic glow based on volume
      const glow = isActive ? Math.max(10, average * 1.5) : 10;
      
      // Draw Inner Orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + (average * 0.2), 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.shadowBlur = glow;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.closePath();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw Rings/Waves if active
      if (isActive && analyser) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const points = 60;
        const angleStep = (Math.PI * 2) / points;
        
        for (let i = 0; i <= points; i++) {
           // Map frequency data to radius
           // We grab a frequency bin index roughly distributed
           const binIndex = Math.floor((i / points) * (dataArray.length / 2));
           const value = dataArray[binIndex];
           const offset = value * 0.5; 
           const r = baseRadius + 20 + offset;
           
           const angle = i * angleStep;
           const x = centerX + Math.cos(angle) * r;
           const y = centerY + Math.sin(angle) * r;
           
           if (i === 0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Second outer ring, faint
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 40 + (average * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isActive, color]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
       if (canvasRef.current && canvasRef.current.parentElement) {
          canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
          canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
       }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default OrbVisualizer;
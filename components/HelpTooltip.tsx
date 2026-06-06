
import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  /** Position preference. Default: 'top'. Falls back automatically near screen edges. */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra class applied to the trigger button wrapper */
  className?: string;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ text, position = 'top', className = '' }) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mobile support)
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  const positionClasses: Record<string, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses: Record<string, string> = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Ajuda"
        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-amber-400 text-slate-500 hover:text-white flex items-center justify-center transition-all duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <HelpCircle size={10} strokeWidth={2.5} />
      </button>

      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[9999] w-56 ${positionClasses[position]} pointer-events-none`}
        >
          <div className="bg-slate-800 text-white text-[11px] font-medium leading-relaxed rounded-xl px-3 py-2.5 shadow-2xl border border-slate-700 whitespace-normal">
            {text}
          </div>
          {/* Arrow */}
          <span
            className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`}
          />
        </div>
      )}
    </span>
  );
};

export default HelpTooltip;

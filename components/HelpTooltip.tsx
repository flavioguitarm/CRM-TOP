
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  /** Position preference. Default: 'top'. Auto-adjusts near screen edges. */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra class applied to the trigger button wrapper */
  className?: string;
}

const TOOLTIP_WIDTH  = 224; // w-56 = 14rem = 224px
const TOOLTIP_GAP    = 10;  // distância do trigger ao balão
const ARROW_SIZE     = 6;   // metade da borda da seta
const SCREEN_PADDING = 8;   // margem mínima da viewport

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipPos {
  top:  number;
  left: number;
  side: Side;
}

/**
 * Calcula a posição final do tooltip (fixed, em px) de forma que
 * ele nunca ultrapasse os limites da viewport.
 *
 * Tenta a `preferredSide` primeiro; se não couber, testa os demais lados
 * na ordem: top → bottom → right → left.
 */
function calcPosition(
  trigger: DOMRect,
  tooltipEl: HTMLDivElement | null,
  preferredSide: Side,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Altura real do tooltip (calculada após render) ou estimativa inicial
  const th = tooltipEl ? tooltipEl.offsetHeight : 60;
  const tw = TOOLTIP_WIDTH;

  // Candidatos de posição para cada lado
  const candidates: Record<Side, TooltipPos> = {
    top: {
      side: 'top',
      top:  trigger.top  - th - TOOLTIP_GAP,
      left: trigger.left + trigger.width / 2 - tw / 2,
    },
    bottom: {
      side: 'bottom',
      top:  trigger.bottom + TOOLTIP_GAP,
      left: trigger.left + trigger.width / 2 - tw / 2,
    },
    left: {
      side: 'left',
      top:  trigger.top  + trigger.height / 2 - th / 2,
      left: trigger.left - tw - TOOLTIP_GAP,
    },
    right: {
      side: 'right',
      top:  trigger.top  + trigger.height / 2 - th / 2,
      left: trigger.right + TOOLTIP_GAP,
    },
  };

  const fits = (p: TooltipPos) =>
    p.top  >= SCREEN_PADDING &&
    p.left >= SCREEN_PADDING &&
    p.top  + th <= vh - SCREEN_PADDING &&
    p.left + tw <= vw - SCREEN_PADDING;

  // Tenta o lado preferido; depois os demais por prioridade
  const order: Side[] = [preferredSide, 'top', 'bottom', 'right', 'left'];
  const seen = new Set<Side>();
  let chosen: TooltipPos | null = null;
  for (const side of order) {
    if (seen.has(side)) continue;
    seen.add(side);
    if (fits(candidates[side])) { chosen = candidates[side]; break; }
  }

  // Fallback: usa o preferido e clipa dentro da viewport
  if (!chosen) chosen = candidates[preferredSide];

  // Garante que não sai da tela em nenhuma dimensão
  const top  = Math.max(SCREEN_PADDING, Math.min(chosen.top,  vh - th - SCREEN_PADDING));
  const left = Math.max(SCREEN_PADDING, Math.min(chosen.left, vw - tw - SCREEN_PADDING));

  return { top, left, side: chosen.side };
}

// ─── Seta direcional ─────────────────────────────────────────────────────────
// Fica na borda do balão voltada para o trigger.

function Arrow({ side, trigger, tooltipRect }: {
  side: Side;
  trigger: DOMRect;
  tooltipRect: { top: number; left: number };
}) {
  const arrowStyle: React.CSSProperties = { position: 'absolute' };

  // Centro do trigger em coords fixed
  const trigCx = trigger.left + trigger.width  / 2;
  const trigCy = trigger.top  + trigger.height / 2;

  const s = ARROW_SIZE;

  if (side === 'top' || side === 'bottom') {
    // Seta horizontal: centraliza em X sobre o trigger, na borda inferior/superior do balão
    const arrowLeft = Math.max(s, Math.min(
      trigCx - tooltipRect.left - s,
      TOOLTIP_WIDTH - s * 3,
    ));
    if (side === 'top') {
      // balão acima → seta aponta pra baixo (na borda bottom do balão)
      Object.assign(arrowStyle, {
        bottom: -s * 2,
        left: arrowLeft,
        borderLeft: `${s}px solid transparent`,
        borderRight: `${s}px solid transparent`,
        borderTop: `${s * 2}px solid #1e293b`,
        borderBottom: 'none',
        width: 0, height: 0,
      });
    } else {
      // balão abaixo → seta aponta pra cima (na borda top do balão)
      Object.assign(arrowStyle, {
        top: -s * 2,
        left: arrowLeft,
        borderLeft: `${s}px solid transparent`,
        borderRight: `${s}px solid transparent`,
        borderBottom: `${s * 2}px solid #1e293b`,
        borderTop: 'none',
        width: 0, height: 0,
      });
    }
  } else {
    // Seta vertical: centraliza em Y sobre o trigger
    const arrowTop = Math.max(s, trigCy - tooltipRect.top - s);
    if (side === 'left') {
      // balão à esquerda → seta aponta pra direita
      Object.assign(arrowStyle, {
        top: arrowTop,
        right: -s * 2,
        borderTop: `${s}px solid transparent`,
        borderBottom: `${s}px solid transparent`,
        borderLeft: `${s * 2}px solid #1e293b`,
        borderRight: 'none',
        width: 0, height: 0,
      });
    } else {
      // balão à direita → seta aponta pra esquerda
      Object.assign(arrowStyle, {
        top: arrowTop,
        left: -s * 2,
        borderTop: `${s}px solid transparent`,
        borderBottom: `${s}px solid transparent`,
        borderRight: `${s * 2}px solid #1e293b`,
        borderLeft: 'none',
        width: 0, height: 0,
      });
    }
  }

  return <span style={arrowStyle} />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  position = 'top' as Side,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState<TooltipPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Recalcula a posição do tooltip
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const trigRect = triggerRef.current.getBoundingClientRect();
    const newPos   = calcPosition(trigRect, tooltipRef.current, position);
    setPos(newPos);
  }, [position]);

  // Abre o tooltip e posiciona imediatamente
  const open = useCallback(() => {
    setVisible(true);
    // Primeira passagem: calcula sem el do tooltip (ainda não montado)
    requestAnimationFrame(() => {
      reposition();
      // Segunda passagem: recalcula com altura real do balão
      requestAnimationFrame(reposition);
    });
  }, [reposition]);

  const close = useCallback(() => {
    setVisible(false);
    setPos(null);
  }, []);

  // Fecha ao clicar fora (mobile + desktop)
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible, close]);

  // Reposiciona ao rolar ou redimensionar
  useEffect(() => {
    if (!visible) return;
    window.addEventListener('scroll',  reposition, true);
    window.addEventListener('resize',  reposition);
    return () => {
      window.removeEventListener('scroll',  reposition, true);
      window.removeEventListener('resize',  reposition);
    };
  }, [visible, reposition]);

  // Trigger rect para a seta (snapshot no momento da abertura)
  const trigRect = triggerRef.current?.getBoundingClientRect() ?? null;

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onClick={() => (visible ? close() : open())}
        onFocus={open}
        onBlur={close}
        aria-label="Ajuda"
        aria-describedby={visible ? 'help-tooltip' : undefined}
        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-amber-400 text-slate-500 hover:text-white flex items-center justify-center transition-all duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <HelpCircle size={10} strokeWidth={2.5} />
      </button>

      {visible && pos && (
        <div
          id="help-tooltip"
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top:      pos.top,
            left:     pos.left,
            width:    TOOLTIP_WIDTH,
            zIndex:   99999,
          }}
          className="pointer-events-none"
        >
          <div className="bg-slate-800 text-white text-[11px] font-medium leading-relaxed rounded-xl px-3 py-2.5 shadow-2xl border border-slate-700 whitespace-normal relative">
            {text}
            {trigRect && (
              <Arrow side={pos.side} trigger={trigRect} tooltipRect={pos} />
            )}
          </div>
        </div>
      )}
    </span>
  );
};

export default HelpTooltip;

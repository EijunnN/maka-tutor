import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';

interface ChatPuckProps {
  onExpand: () => void;
  hasUnseenShots: boolean;
}

export const ChatPuck = forwardRef<HTMLButtonElement, ChatPuckProps>(
  ({ onExpand, hasUnseenShots }, ref) => {
    return (
      <div className="pointer-events-auto fixed bottom-6 right-6 z-20">
        <button
          ref={ref}
          type="button"
          onClick={onExpand}
          aria-label="Abrir chat"
          className="glass-puck animate-puck-enter group relative flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{ width: 52, height: 52 }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
          <Sparkles
            size={20}
            strokeWidth={1.8}
            className="relative text-zinc-100 transition-colors duration-200 group-hover:text-violet-200"
          />
          {hasUnseenShots && (
            <span className="absolute right-0 top-0 size-2.5 rounded-full bg-rose-400 shadow-[0_0_0_2px_rgba(20,20,24,0.85),0_0_8px_rgba(244,63,94,0.6)]" />
          )}
        </button>
      </div>
    );
  },
);

ChatPuck.displayName = 'ChatPuck';

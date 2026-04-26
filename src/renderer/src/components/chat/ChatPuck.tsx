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
          className="animate-puck-enter group relative flex items-center justify-center rounded-full border border-white/10 bg-neutral-950/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-violet-400/40 hover:shadow-[0_12px_40px_rgba(139,92,246,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{ width: 52, height: 52 }}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-violet-500/0 transition-all duration-300 group-hover:from-violet-500/10 group-hover:via-transparent group-hover:to-blue-500/5" />
          <Sparkles
            size={20}
            strokeWidth={2}
            className="relative text-zinc-300 transition-colors duration-200 group-hover:text-violet-300"
          />
          {hasUnseenShots && (
            <span className="absolute right-0 top-0 size-2.5 rounded-full bg-rose-400 ring-2 ring-neutral-950" />
          )}
        </button>
      </div>
    );
  },
);

ChatPuck.displayName = 'ChatPuck';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../hooks/useChat';

interface Props {
  message: ChatMessage;
  streaming?: boolean;
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.shots && message.shots.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {message.shots.map((s) => (
              <img
                key={s.path}
                src={s.url}
                alt=""
                className="h-16 max-w-[140px] rounded-lg border border-white/15 object-cover shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
              />
            ))}
          </div>
        )}
        {message.text.trim().length > 0 && (
          <div className="glass-bubble-user max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-zinc-50">
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="prose-aprende max-w-[92%] text-sm text-zinc-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text || '​'}</ReactMarkdown>
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-violet-300/80" />
        )}
      </div>
    </div>
  );
}

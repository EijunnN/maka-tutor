import { useCallback, useRef, useState } from 'react';
import { Frame } from './components/overlay/Frame';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatPuck } from './components/chat/ChatPuck';
import { useClickthrough } from './hooks/useClickthrough';
import { useScreenshots } from './hooks/useScreenshots';
import { useAgent } from './hooks/useAgent';

export function App() {
  const [minimized, setMinimized] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const setTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const interactive = useClickthrough(targetRef);
  const { shots, error: shotsError, remove, clear } = useScreenshots();
  const { messages, status, error: agentError, send, cancel, reset } = useAgent();

  const handleSend = useCallback(
    (text: string) => {
      const currentShots = shots;
      send(text, currentShots);
      clear();
    },
    [send, shots, clear],
  );

  const handleReset = useCallback(() => {
    void reset();
  }, [reset]);

  return (
    <>
      <Frame />
      {minimized ? (
        <ChatPuck
          ref={setTarget}
          onExpand={() => setMinimized(false)}
          hasUnseenShots={shots.length > 0}
        />
      ) : (
        <ChatPanel
          ref={setTarget}
          interactive={interactive}
          shots={shots}
          onRemoveShot={remove}
          shotsError={shotsError}
          agentError={agentError}
          messages={messages}
          status={status}
          onSend={handleSend}
          onCancel={cancel}
          onReset={handleReset}
          onMinimize={() => setMinimized(true)}
          onClose={() => window.api.quit()}
        />
      )}
    </>
  );
}

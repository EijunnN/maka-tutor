import { useCallback, useRef, useState } from 'react';
import { Frame } from './components/overlay/Frame';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatPuck } from './components/chat/ChatPuck';
import { useClickthrough } from './hooks/useClickthrough';
import { useScreenshots } from './hooks/useScreenshots';

export function App() {
  const [minimized, setMinimized] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const setTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const interactive = useClickthrough(targetRef);
  const { shots, error, remove } = useScreenshots();

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
          error={error}
          onMinimize={() => setMinimized(true)}
          onClose={() => window.api.quit()}
        />
      )}
    </>
  );
}

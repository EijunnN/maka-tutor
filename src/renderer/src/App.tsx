import { useRef } from 'react';
import { Frame } from './components/overlay/Frame';
import { ChatPanel } from './components/chat/ChatPanel';
import { useClickthrough } from './hooks/useClickthrough';
import { useScreenshots } from './hooks/useScreenshots';

export function App() {
  const panelRef = useRef<HTMLDivElement>(null);
  const interactive = useClickthrough(panelRef);
  const { shots, error, remove } = useScreenshots();

  return (
    <>
      <Frame />
      <ChatPanel
        ref={panelRef}
        interactive={interactive}
        shots={shots}
        onRemoveShot={remove}
        error={error}
      />
    </>
  );
}

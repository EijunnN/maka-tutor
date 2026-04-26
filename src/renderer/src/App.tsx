import { useRef } from 'react';
import { Frame } from './components/overlay/Frame';
import { ChatPanel } from './components/chat/ChatPanel';
import { useClickthrough } from './hooks/useClickthrough';

export function App() {
  const panelRef = useRef<HTMLDivElement>(null);
  const interactive = useClickthrough(panelRef);

  return (
    <>
      <Frame />
      <ChatPanel ref={panelRef} interactive={interactive} />
    </>
  );
}

import { useCallback, useRef, useState } from 'react';
import { Frame } from './components/overlay/Frame';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatPuck } from './components/chat/ChatPuck';
import { useClickthrough } from './hooks/useClickthrough';
import { useScreenshots } from './hooks/useScreenshots';
import { useChat } from './hooks/useChat';

export function App() {
  const [minimized, setMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const setTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const interactive = useClickthrough(targetRef);
  const { shots, error: shotsError, remove, clear } = useScreenshots();
  const {
    conversations,
    activeId,
    messages,
    status,
    error: agentError,
    send,
    cancel,
    newChat,
    openChat,
    deleteChat,
  } = useChat();

  const handleSend = useCallback(
    (text: string) => {
      const currentShots = shots;
      send(text, currentShots);
      clear();
    },
    [send, shots, clear],
  );

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
          conversations={conversations}
          activeId={activeId}
          onNewChat={() => void newChat()}
          onOpenChat={(id) => void openChat(id)}
          onDeleteChat={(id) => void deleteChat(id)}
          onMinimize={() => setMinimized(true)}
          onClose={() => window.api.quit()}
          onOpenSettings={() => setSettingsOpen(true)}
          settingsOpen={settingsOpen}
          onCloseSettings={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

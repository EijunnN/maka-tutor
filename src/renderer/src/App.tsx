import { useEffect, useState } from 'react';

export function App() {
  const [pong, setPong] = useState<string>('...');

  useEffect(() => {
    window.ipc.invoke<string>('ping').then(setPong).catch((e) => setPong(`error: ${String(e)}`));
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">aprende-mierda</h1>
        <p className="mt-2 text-zinc-400">Fase 0 — setup OK</p>
        <p className="mt-6 text-sm text-zinc-500">
          IPC: <span className="font-mono text-emerald-400">{pong}</span>
        </p>
      </div>
    </div>
  );
}

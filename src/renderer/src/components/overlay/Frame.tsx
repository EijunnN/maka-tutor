export function Frame() {
  // Strips finos con un tinte suave; junto a las esquinas sutiles
  // dan presencia sin competir con el panel glass.
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

      <div className="absolute left-0 top-0 size-5 rounded-tl-2xl border-l border-t border-violet-300/40" />
      <div className="absolute right-0 top-0 size-5 rounded-tr-2xl border-r border-t border-violet-300/40" />
      <div className="absolute bottom-0 left-0 size-5 rounded-bl-2xl border-b border-l border-violet-300/40" />
      <div className="absolute bottom-0 right-0 size-5 rounded-br-2xl border-b border-r border-violet-300/40" />
    </div>
  );
}

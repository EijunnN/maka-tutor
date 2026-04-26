export function Frame() {
  const stripGradient =
    'bg-[linear-gradient(90deg,rgba(34,211,238,0.55),rgba(167,139,250,0.85),rgba(236,72,153,0.55))]';
  const stripGradientV =
    'bg-[linear-gradient(180deg,rgba(34,211,238,0.55),rgba(167,139,250,0.85),rgba(236,72,153,0.55))]';
  const glow = 'shadow-[0_0_24px_rgba(167,139,250,0.55)]';

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${stripGradient} ${glow}`} />
      <div className={`absolute inset-x-0 bottom-0 h-[2px] ${stripGradient} ${glow}`} />
      <div className={`absolute inset-y-0 left-0 w-[2px] ${stripGradientV} ${glow}`} />
      <div className={`absolute inset-y-0 right-0 w-[2px] ${stripGradientV} ${glow}`} />

      <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-2xl border-l-2 border-t-2 border-cyan-300/80" />
      <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-2xl border-r-2 border-t-2 border-fuchsia-300/80" />
      <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-2xl border-b-2 border-l-2 border-cyan-300/80" />
      <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-2xl border-b-2 border-r-2 border-fuchsia-300/80" />
    </div>
  );
}

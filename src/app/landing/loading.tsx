export default function LandingLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-sm">Carregando WorkID…</p>
      </div>
    </div>
  );
}

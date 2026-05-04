export default function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <div className="w-9 h-9 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-sm">Preparando seu cadastro…</p>
      </div>
    </div>
  );
}

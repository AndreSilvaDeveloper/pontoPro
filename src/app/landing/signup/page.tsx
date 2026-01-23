import Link from "next/link";

export default function SignupPlaceholder() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur p-8 space-y-4">
        <h1 className="text-2xl font-extrabold">Cadastro (Landing)</h1>
        <p className="text-slate-300">
          Placeholder seguro. Depois aqui entra a página real de cadastro do projeto do seu amigo.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/_landing"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent text-white font-bold py-3 px-5 hover:bg-white/5 transition"
          >
            Voltar para Landing
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white text-slate-950 font-bold py-3 px-5 hover:bg-slate-200 transition"
          >
            Ir para Login (app atual)
          </Link>
        </div>
      </div>
    </main>
  );
}

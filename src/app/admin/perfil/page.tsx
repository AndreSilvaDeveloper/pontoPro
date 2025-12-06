"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Lock, Save, User } from "lucide-react";
import { useSession } from "next-auth/react";

export default function PerfilAdmin() {
  const { data: session } = useSession();

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (senha !== confirmar) {
      setMsg({ tipo: "erro", texto: "As senhas não conferem." });
      return;
    }

    if (senha.length < 4) {
      setMsg({
        tipo: "erro",
        texto: "A senha precisa ter no mínimo 4 caracteres.",
      });
      return;
    }

    setLoading(true);

    try {
      // Reutilizamos a mesma API que criamos antes!
      await axios.post("/api/auth/trocar-senha", { novaSenha: senha });

      setMsg({ tipo: "sucesso", texto: "Senha alterada com sucesso!" });
      setSenha("");
      setConfirmar("");
    } catch (error: any) {
      setMsg({
        tipo: "erro",
        texto:
          "Erro ao salvar: " +
          (error.response?.data?.erro || "Tente novamente."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Meu Perfil</h1>
            <p className="text-slate-400 text-sm">
              Gerencie suas credenciais de acesso
            </p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Voltar ao Painel
          </Link>
        </div>

        {/* Cartão de Dados Pessoais (Apenas Visual) */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center text-purple-400">
            <User size={32} />
          </div>
          <div>
            <h2 className="font-bold text-lg">{session?.user?.name}</h2>
            <p className="text-slate-400">{session?.user?.email}</p>
            <span className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded uppercase mt-1 inline-block">
              {session?.user?.cargo}
            </span>
          </div>
        </div>

        {/* Formulário de Alterar Senha */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="font-bold mb-6 flex items-center gap-2 text-white">
            <Lock size={20} className="text-yellow-500" /> Alterar Senha
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Digite a nova senha"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Confirme a Nova Senha
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Digite novamente"
                required
              />
            </div>

            {msg && (
              <div
                className={`p-3 rounded-lg text-sm text-center font-bold ${
                  msg.tipo === "erro"
                    ? "bg-red-900/50 text-red-200"
                    : "bg-green-900/50 text-green-200"
                }`}
              >
                {msg.texto}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  "Salvando..."
                ) : (
                  <>
                    <Save size={20} /> ATUALIZAR SENHA
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

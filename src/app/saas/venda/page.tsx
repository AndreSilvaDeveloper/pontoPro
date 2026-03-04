'use client';

import { useState } from "react";
import axios from "axios";
import { ArrowLeft, CheckCircle, Copy, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLANOS, type PlanoId } from "@/config/planos";

const planoKeys: PlanoId[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

const planoColors: Record<PlanoId, { border: string; bg: string; badge: string }> = {
  STARTER: {
    border: "border-blue-500",
    bg: "bg-blue-500/10 ring-2 ring-blue-500/20",
    badge: "bg-blue-500/15 text-blue-400",
  },
  PROFESSIONAL: {
    border: "border-purple-500",
    bg: "bg-purple-500/10 ring-2 ring-purple-500/20",
    badge: "bg-purple-500/15 text-purple-400",
  },
  ENTERPRISE: {
    border: "border-amber-500",
    bg: "bg-amber-500/10 ring-2 ring-amber-500/20",
    badge: "bg-amber-500/15 text-amber-400",
  },
};

export default function NovaVendaPage() {
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoId>("PROFESSIONAL");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [senhaInicial, setSenhaInicial] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    try {
      const res = await axios.post("/api/saas/criar-empresa", {
        nomeEmpresa,
        cnpj,
        nomeDono,
        emailDono,
        senhaInicial,
        plano: planoSelecionado,
      });
      setResultado({
        ...res.data,
        senha: senhaInicial,
        plano: planoSelecionado,
      });
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao criar.");
    } finally {
      setLoading(false);
    }
  };

  const copiarCredenciais = () => {
    if (!resultado) return;
    const text = `Empresa: ${resultado.dados.empresa}\nLogin: ${resultado.dados.login}\nSenha: ${resultado.senha}\nPlano: ${resultado.plano}`;
    navigator.clipboard.writeText(text);
    alert("Credenciais copiadas!");
  };

  const criarOutro = () => {
    setResultado(null);
    setNomeEmpresa("");
    setCnpj("");
    setNomeDono("");
    setEmailDono("");
    setSenhaInicial("1234");
  };

  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orb-purple rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/saas"
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1 className="text-lg font-bold">Nova Venda</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {resultado ? (
          /* Estado de sucesso */
          <div className="max-w-md mx-auto">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-emerald-400 mb-2">Cliente Criado!</h2>

              <div className="bg-surface rounded-xl p-4 text-left space-y-2 mt-6 text-sm">
                <p className="text-text-muted">
                  Empresa: <strong className="text-text-primary">{resultado.dados.empresa}</strong>
                </p>
                <p className="text-text-muted">
                  Login: <strong className="text-text-primary select-all">{resultado.dados.login}</strong>
                </p>
                <p className="text-text-muted">
                  Senha: <strong className="text-text-primary select-all">{resultado.senha}</strong>
                </p>
                <p className="text-text-muted">
                  Plano: <strong className="text-text-primary">{resultado.plano}</strong>
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={copiarCredenciais}
                  className="flex-1 flex items-center justify-center gap-2 bg-elevated-solid hover:bg-elevated-solid text-text-primary py-3 rounded-xl text-sm font-medium transition-colors"
                >
                  <Copy size={16} /> Copiar Credenciais
                </button>
                <button
                  onClick={criarOutro}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> Criar Outro
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Seleção de Plano */}
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">
                Selecione o Plano
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {planoKeys.map((key) => {
                  const plano = PLANOS[key];
                  const colors = planoColors[key];
                  const selected = planoSelecionado === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setPlanoSelecionado(key)}
                      className={`text-left p-5 rounded-2xl border transition-all ${
                        selected
                          ? `${colors.border} ${colors.bg}`
                          : "border-border-subtle bg-surface hover:border-border-default"
                      }`}
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors.badge}`}>
                        {plano.nome}
                      </span>
                      <p className="text-2xl font-bold text-text-primary mt-3">
                        R$ {plano.preco.toFixed(2).replace(".", ",")}
                        <span className="text-sm text-text-muted font-normal">/mês</span>
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-text-muted">
                        <li>Até {plano.maxFuncionarios} funcionários</li>
                        <li>Até {plano.maxAdmins} admin{plano.maxAdmins > 1 ? "s" : ""}</li>
                        <li>{plano.maxFiliais === -1 ? "Filiais ilimitadas" : plano.maxFiliais === 0 ? "Só matriz" : `Até ${plano.maxFiliais} filiais`}</li>
                        <li>{plano.reconhecimentoFacial ? "Reconhecimento facial" : "Sem reconhecimento facial"}</li>
                        <li>Suporte: {plano.suporte.replace("_", " + ").toLowerCase()}</li>
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulário */}
            <div className="max-w-lg mx-auto">
              <div className="bg-surface border border-border-subtle rounded-2xl p-6 backdrop-blur">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">
                  Dados do Cliente
                </h2>

                <form onSubmit={criarCliente} className="space-y-4">
                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Nome da Empresa</label>
                    <input
                      className="w-full bg-elevated p-3 rounded-xl text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 text-sm"
                      placeholder="Ex: Padaria do João"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-faint mb-1 block">CNPJ (opcional)</label>
                    <input
                      className="w-full bg-elevated p-3 rounded-xl text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 text-sm"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Nome do Responsável</label>
                    <input
                      className="w-full bg-elevated p-3 rounded-xl text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 text-sm"
                      placeholder="João da Silva"
                      value={nomeDono}
                      onChange={(e) => setNomeDono(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Email do Responsável</label>
                    <input
                      className="w-full bg-elevated p-3 rounded-xl text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 text-sm"
                      type="email"
                      placeholder="joao@empresa.com"
                      value={emailDono}
                      onChange={(e) => setEmailDono(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Senha Inicial</label>
                    <input
                      className="w-full bg-elevated p-3 rounded-xl text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 text-sm"
                      value={senhaInicial}
                      onChange={(e) => setSenhaInicial(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Criando...
                      </>
                    ) : (
                      "CRIAR CLIENTE"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

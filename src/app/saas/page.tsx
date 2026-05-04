'use client';

import { useState, useEffect } from "react";
import axios from "axios";
import {
  LogOut,
  FileText,
  Loader2,
  X,
  Link as LinkIcon,
  Plus,
  Handshake,
  Inbox,
  Search,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { gerarRelatorioGeral } from "@/lib/saas-pdf";

import StatsStrip, { type DashboardStats } from "./components/StatsStrip";
import InsightsBoard from "./components/InsightsBoard";
import ClientTable from "./components/ClientTable";
import ModalEquipe from "./components/ModalEquipe";
import ModalFatura from "./components/ModalFatura";
import BellDropdown from "./components/BellDropdown";
import PushToastListener from "./components/PushToastListener";
import PushPermissionPrompt from "./components/PushPermissionPrompt";
import CommandPalette from "./components/CommandPalette";
import DashboardHero from "./components/DashboardHero";

export default function SuperAdminPage() {
  const router = useRouter();

  // === DADOS ===
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingListar, setLoadingListar] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // === MODAIS ===
  const [modalAdminOpen, setModalAdminOpen] = useState(false);
  const [modalEquipeOpen, setModalEquipeOpen] = useState(false);
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [modalFaturaOpen, setModalFaturaOpen] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [matrizAlvoId, setMatrizAlvoId] = useState("");
  const [loadingVinculo, setLoadingVinculo] = useState(false);
  const [loadingPagamento, setLoadingPagamento] = useState<string | null>(null);

  const [adminData, setAdminData] = useState({ nome: "", email: "", senha: "123" });
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // === CARREGAMENTO INICIAL ===
  useEffect(() => {
    listarEmpresas();
    carregarStats();
  }, []);

  const listarEmpresas = async () => {
    setLoadingListar(true);
    try {
      const res = await axios.post("/api/saas/gestao");
      setEmpresas(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) return;
      console.error("Erro listar", error);
    } finally {
      setLoadingListar(false);
    }
  };

  const carregarStats = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get("/api/saas/dashboard");
      setStats(res.data);
    } catch {
      console.error("Erro ao carregar stats");
    } finally {
      setLoadingStats(false);
    }
  };

  // === AÇÕES ===
  const entrarComo = async (user: any) => {
    try {
      await axios.post("/api/admin/impersonate", { userId: user.id });
      setModalEquipeOpen(false);
      if (user.cargo === "FUNCIONARIO") router.push("/funcionario");
      else router.push("/admin");
    } catch {
      alert("Não foi possível entrar como este usuário.");
    }
  };

  const alternarStatus = async (id: string, nome: string, status: string) => {
    const acao = status === "ATIVO" ? "BLOQUEAR" : "ATIVAR";
    if (!confirm(`Deseja ${acao} a empresa ${nome}?`)) return;
    try {
      await axios.put("/api/saas/gestao", { empresaId: id, acao: "ALTERAR_STATUS" });
      listarEmpresas();
      carregarStats();
    } catch {
      alert("Erro ao alterar status");
    }
  };

  const excluirEmpresa = async (id: string, nome: string) => {
    const confirmacao = window.prompt(
      `PERIGO: Isso apagará TODOS os dados de "${nome}".\nDigite "DELETAR" para confirmar:`
    );
    if (confirmacao !== "DELETAR") return;
    try {
      await axios.delete("/api/saas/excluir-empresa", { data: { id } });
      alert("Empresa excluída!");
      listarEmpresas();
      carregarStats();
    } catch (e: any) {
      alert(e.response?.data?.erro || "Erro ao excluir");
    }
  };

  const confirmarPagamentoManual = async (empresaId: string) => {
    if (!confirm("Deseja marcar a fatura deste mês como PAGA para este cliente?")) return;
    setLoadingPagamento(empresaId);
    try {
      await axios.post("/api/saas/confirmar-pagamento", { empresaId });
      alert("Pagamento confirmado com sucesso!");
      listarEmpresas();
      carregarStats();
    } catch {
      alert("Erro ao confirmar pagamento.");
    } finally {
      setLoadingPagamento(null);
    }
  };

  const salvarVinculo = async () => {
    if (!matrizAlvoId) return alert("Selecione uma matriz");
    setLoadingVinculo(true);
    try {
      await axios.put("/api/saas/gestao", {
        empresaId: empresaSelecionada.id,
        acao: "VINCULAR_MATRIZ",
        matrizId: matrizAlvoId,
      });
      alert("Empresa vinculada com sucesso!");
      setModalVincularOpen(false);
      listarEmpresas();
    } catch {
      alert("Erro ao vincular");
    } finally {
      setLoadingVinculo(false);
    }
  };

  const salvarNovoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAdmin(true);
    try {
      await axios.post("/api/saas/novo-admin", {
        empresaId: empresaSelecionada.id,
        nome: adminData.nome,
        email: adminData.email,
        senha: adminData.senha,
      });
      alert(`Acesso criado para ${adminData.nome}!`);
      setModalAdminOpen(false);
      listarEmpresas();
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao criar admin");
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleRelatorioGeral = () => {
    const url = gerarRelatorioGeral(empresas);
    window.open(url, "_blank");
  };

  // === CALLBACKS PARA COMPONENTES ===
  const openEquipe = (emp: any) => {
    setEmpresaSelecionada(emp);
    setModalEquipeOpen(true);
  };

  const openFatura = (emp: any) => {
    setEmpresaSelecionada(emp);
    setModalFaturaOpen(true);
  };

  const openVincular = (emp: any) => {
    setEmpresaSelecionada(emp);
    setMatrizAlvoId("");
    setModalVincularOpen(true);
  };

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <ImpersonationBanner />

      {/* Prompt de permissão de notificação */}
      <PushPermissionPrompt />

      {/* Toast in-app quando push chega com painel aberto */}
      <PushToastListener />

      {/* Cmd+K busca rápida */}
      <CommandPalette empresas={empresas} />

      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orb-purple rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WorkID" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold text-text-primary">WorkID</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Painel Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Busca rápida (atalho Cmd+K) */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="hidden md:flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-faint px-3 py-2 rounded-xl border border-border-subtle text-xs transition-colors"
              title="Busca rápida"
            >
              <Search size={14} />
              <span>Buscar</span>
              <kbd className="bg-page text-[10px] px-1.5 py-0.5 rounded border border-border-subtle ml-1">⌘K</kbd>
            </button>

            <BellDropdown />

            <Link
              href="/saas/leads"
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
              title="Leads"
            >
              <Inbox size={16} />
            </Link>

            <Link
              href="/saas/analytics"
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
              title="Analytics de marketing"
            >
              <BarChart3 size={16} />
            </Link>

            <Link
              href="/saas/revendedores"
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
              title="Revendedores"
            >
              <Handshake size={16} />
            </Link>

            <button
              onClick={handleRelatorioGeral}
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
              title="Relatório geral PDF"
            >
              <FileText size={16} />
            </button>

            <Link
              href="/saas/venda"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-purple-600/20"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nova Venda</span>
            </Link>

            <button
              onClick={() => { try { localStorage.removeItem('workid_rt'); } catch {} signOut({ callbackUrl: "/login" }); }}
              className="flex items-center gap-2 text-text-muted hover:text-red-400 px-3 py-2 rounded-xl text-sm transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 relative z-10">
        <DashboardHero
          mrr={stats?.mrr}
          totalAtivos={stats?.totalAtivos}
          totalEmpresas={stats?.totalEmpresas}
          loading={loadingStats}
        />

        <InsightsBoard stats={stats} empresas={empresas} loading={loadingStats || loadingListar} />

        <StatsStrip stats={stats} loading={loadingStats} />

        <ClientTable
          empresas={empresas}
          loading={loadingListar}
          loadingPagamento={loadingPagamento}
          onRefresh={() => { listarEmpresas(); carregarStats(); }}
          onOpenEquipe={openEquipe}
          onOpenFatura={openFatura}
          onAlternarStatus={alternarStatus}
          onExcluir={excluirEmpresa}
          onConfirmarPagamento={confirmarPagamentoManual}
          onVincular={openVincular}
        />
      </main>

      {/* === MODAIS === */}

      {/* Modal Equipe */}
      <ModalEquipe
        open={modalEquipeOpen}
        onOpenChange={setModalEquipeOpen}
        empresa={empresaSelecionada}
        onEntrarComo={entrarComo}
        onAbrirModalAdmin={() => setModalAdminOpen(true)}
        onRecarregarEmpresas={listarEmpresas}
      />

      {/* Modal Fatura */}
      <ModalFatura
        open={modalFaturaOpen}
        onOpenChange={setModalFaturaOpen}
        empresa={empresaSelecionada}
      />

      {/* Modal Vincular */}
      {modalVincularOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setModalVincularOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-text-primary"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-1 text-text-primary flex items-center gap-2">
              <LinkIcon size={20} className="text-yellow-500" /> Vincular Matriz
            </h3>

            <div className="space-y-4 mt-4">
              <select
                className="w-full bg-gray-800 p-3 rounded-lg text-text-primary border border-gray-700 outline-none focus:border-yellow-500"
                value={matrizAlvoId}
                onChange={(e) => setMatrizAlvoId(e.target.value)}
              >
                <option value="">Selecione a Matriz Principal...</option>
                {empresas
                  .filter((e) => e.id !== empresaSelecionada.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome}
                    </option>
                  ))}
              </select>

              <button
                onClick={salvarVinculo}
                disabled={loadingVinculo || !matrizAlvoId}
                className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-lg font-bold text-black disabled:opacity-50 transition-all active:scale-95"
              >
                {loadingVinculo ? <Loader2 className="animate-spin mx-auto" size={18} /> : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin */}
      {modalAdminOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative">
            <button
              onClick={() => setModalAdminOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-text-primary"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold mb-4 text-text-primary">Novo Acesso</h3>

            <form onSubmit={salvarNovoAdmin} className="space-y-3">
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-text-primary border border-gray-700"
                placeholder="Nome"
                onChange={(e) => setAdminData({ ...adminData, nome: e.target.value })}
                required
              />
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-text-primary border border-gray-700"
                placeholder="Email"
                type="email"
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                required
              />
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-text-primary border border-gray-700"
                placeholder="Senha"
                value={adminData.senha}
                onChange={(e) => setAdminData({ ...adminData, senha: e.target.value })}
                required
              />
              <button
                disabled={loadingAdmin}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded font-bold mt-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {loadingAdmin ? <Loader2 className="animate-spin mx-auto" size={18} /> : "CRIAR"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

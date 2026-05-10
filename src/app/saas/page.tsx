'use client';

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2,
  X,
  Link as LinkIcon,
} from "lucide-react";

import StatsStrip, { type DashboardStats } from "./components/StatsStrip";
import InsightsBoard from "./components/InsightsBoard";
import ClientTable from "./components/ClientTable";
import ModalEquipe from "./components/ModalEquipe";
import ModalFatura from "./components/ModalFatura";
import DashboardHero from "./components/DashboardHero";
import { confirmar } from "@/lib/saasUi";

export default function SuperAdminPage() {
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
      const dest = user.cargo === "FUNCIONARIO" ? "/funcionario" : "/admin";
      window.location.href = dest;
    } catch {
      toast.error("Não foi possível entrar como este usuário.");
    }
  };

  const alternarStatus = async (id: string, nome: string, status: string) => {
    const bloqueando = status === "ATIVO";
    const ok = await confirmar({
      titulo: bloqueando ? `Bloquear ${nome}?` : `Ativar ${nome}?`,
      mensagem: bloqueando
        ? "A empresa perde acesso ao sistema até ser reativada."
        : "A empresa volta a ter acesso normal ao sistema.",
      perigo: bloqueando,
      labelConfirmar: bloqueando ? "Bloquear" : "Ativar",
    });
    if (!ok) return;
    try {
      await axios.put("/api/saas/gestao", { empresaId: id, acao: "ALTERAR_STATUS" });
      toast.success(bloqueando ? `${nome} foi bloqueada.` : `${nome} foi ativada.`);
      listarEmpresas();
      carregarStats();
    } catch {
      toast.error("Erro ao alterar status.");
    }
  };

  const excluirEmpresa = async (id: string, nome: string) => {
    const ok = await confirmar({
      titulo: `Excluir ${nome}?`,
      mensagem: "Isso apagará TODOS os dados desta empresa permanentemente. Esta ação não pode ser desfeita.",
      perigo: true,
      labelConfirmar: "Excluir empresa",
      exigirDigitar: "DELETAR",
    });
    if (!ok) return;
    try {
      await axios.delete("/api/saas/excluir-empresa", { data: { id } });
      toast.success(`${nome} excluída.`);
      listarEmpresas();
      carregarStats();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || "Erro ao excluir.");
    }
  };

  const confirmarPagamentoManual = async (empresaId: string) => {
    const ok = await confirmar({
      titulo: "Confirmar pagamento manualmente?",
      mensagem: "A fatura do mês será marcada como PAGA para este cliente.",
      labelConfirmar: "Marcar como pago",
    });
    if (!ok) return;
    setLoadingPagamento(empresaId);
    try {
      await axios.post("/api/saas/confirmar-pagamento", { empresaId });
      toast.success("Pagamento confirmado.");
      listarEmpresas();
      carregarStats();
    } catch {
      toast.error("Erro ao confirmar pagamento.");
    } finally {
      setLoadingPagamento(null);
    }
  };

  const salvarVinculo = async () => {
    if (!matrizAlvoId) return toast.warning("Selecione uma matriz.");
    setLoadingVinculo(true);
    try {
      await axios.put("/api/saas/gestao", {
        empresaId: empresaSelecionada.id,
        acao: "VINCULAR_MATRIZ",
        matrizId: matrizAlvoId,
      });
      toast.success("Empresa vinculada à matriz.");
      setModalVincularOpen(false);
      listarEmpresas();
    } catch {
      toast.error("Erro ao vincular.");
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
      toast.success(`Acesso criado para ${adminData.nome}.`);
      setModalAdminOpen(false);
      listarEmpresas();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || "Erro ao criar admin.");
    } finally {
      setLoadingAdmin(false);
    }
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
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
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
      </div>

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

      {/* Modal Vincular Matriz */}
      {modalVincularOpen && empresaSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setModalVincularOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-default bg-page shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <LinkIcon size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-text-primary truncate">Vincular matriz</h3>
                  <p className="text-xs text-text-muted truncate">{empresaSelecionada.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModalVincularOpen(false)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-elevated/60 text-text-muted"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-text-muted">Matriz principal</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl bg-elevated/60 border border-border-subtle text-sm text-text-primary outline-none focus:border-purple-500 transition-colors"
                  value={matrizAlvoId}
                  onChange={(e) => setMatrizAlvoId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {empresas
                    .filter((e) => e.id !== empresaSelecionada.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
              <button
                onClick={() => setModalVincularOpen(false)}
                className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:bg-elevated/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVinculo}
                disabled={loadingVinculo || !matrizAlvoId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {loadingVinculo && <Loader2 size={14} className="animate-spin" />}
                Vincular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Acesso */}
      {modalAdminOpen && empresaSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setModalAdminOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-default bg-page shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-border-subtle">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-text-primary">Novo acesso</h3>
                <p className="text-xs text-text-muted truncate">{empresaSelecionada.nome}</p>
              </div>
              <button
                onClick={() => setModalAdminOpen(false)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-elevated/60 text-text-muted"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvarNovoAdmin}>
              <div className="p-5 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted">Nome</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-elevated/60 border border-border-subtle text-sm outline-none focus:border-purple-500 transition-colors"
                    placeholder="Nome completo"
                    value={adminData.nome}
                    onChange={(e) => setAdminData({ ...adminData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2.5 rounded-xl bg-elevated/60 border border-border-subtle text-sm outline-none focus:border-purple-500 transition-colors"
                    placeholder="email@empresa.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted">Senha provisória</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-elevated/60 border border-border-subtle text-sm font-mono outline-none focus:border-purple-500 transition-colors"
                    value={adminData.senha}
                    onChange={(e) => setAdminData({ ...adminData, senha: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setModalAdminOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:bg-elevated/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAdmin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                >
                  {loadingAdmin && <Loader2 size={14} className="animate-spin" />}
                  Criar acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

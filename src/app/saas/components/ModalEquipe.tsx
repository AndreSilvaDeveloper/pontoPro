'use client';

import { useState, useEffect } from "react";
import { Users, LogIn, KeyRound, Trash2, UserPlus, X, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { confirmar } from "@/lib/saasUi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: any;
  onEntrarComo: (user: any) => void;
  onAbrirModalAdmin: () => void;
  onRecarregarEmpresas: () => void;
};

export default function ModalEquipe({
  open,
  onOpenChange,
  empresa,
  onEntrarComo,
  onAbrirModalAdmin,
  onRecarregarEmpresas,
}: Props) {
  const [equipeUsers, setEquipeUsers] = useState<any[]>([]);
  const [loadingEquipeUsers, setLoadingEquipeUsers] = useState(false);
  const [qEquipe, setQEquipe] = useState("");
  const [cargoEquipe, setCargoEquipe] = useState("TODOS");

  const carregarUsuarios = async (opts?: { q?: string; cargo?: string }) => {
    if (!empresa?.id) return;
    setLoadingEquipeUsers(true);
    try {
      const res = await axios.post("/api/saas/usuarios", {
        empresaId: empresa.id,
        q: opts?.q || "",
        cargo: opts?.cargo || "TODOS",
        take: 200,
      });
      setEquipeUsers(res.data?.usuarios || []);
    } catch (err) {
      console.error("Erro ao carregar usuários da empresa", err);
      setEquipeUsers([]);
    } finally {
      setLoadingEquipeUsers(false);
    }
  };

  // Load on open
  useEffect(() => {
    if (open && empresa?.id) {
      setQEquipe("");
      setCargoEquipe("TODOS");
      carregarUsuarios({ q: "", cargo: "TODOS" });
    }
  }, [open, empresa?.id]);

  // Debounced search
  useEffect(() => {
    if (!open || !empresa?.id) return;
    const t = setTimeout(() => {
      carregarUsuarios({ q: qEquipe, cargo: cargoEquipe });
    }, 300);
    return () => clearTimeout(t);
  }, [qEquipe, cargoEquipe]);

  const excluirUsuario = async (userId: string) => {
    const ok = await confirmar({
      titulo: "Remover este acesso?",
      mensagem: "O usuário não conseguirá mais entrar no sistema.",
      perigo: true,
      labelConfirmar: "Remover",
    });
    if (!ok) return;
    try {
      await axios.delete("/api/saas/excluir-usuario", { data: { id: userId } });
      toast.success("Acesso removido.");
      await carregarUsuarios({ q: qEquipe, cargo: cargoEquipe });
      onRecarregarEmpresas();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || "Erro ao excluir usuário.");
    }
  };

  const resetarSenha = async (user: any) => {
    const ok = await confirmar({
      titulo: `Resetar senha de ${user.nome}?`,
      mensagem: "A nova senha será 1234. O usuário deve trocar no próximo login.",
      labelConfirmar: "Resetar senha",
    });
    if (!ok) return;
    try {
      await axios.post("/api/saas/resetar-senha", { usuarioId: user.id });
      toast.success("Senha resetada para 1234.");
    } catch (e: any) {
      toast.error(e.response?.data?.erro || "Erro ao resetar senha.");
    }
  };

  if (!open || !empresa) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md relative">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
          <Users className="text-purple-500" /> Gestão de Acessos
        </h3>

        <p className="text-xs text-slate-400 mb-3">
          Empresa: <strong className="text-white">{empresa.nome}</strong>
        </p>

        {/* Busca */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={qEquipe}
            onChange={(e) => setQEquipe(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full bg-gray-800 p-2.5 rounded-lg text-white border border-gray-700 outline-none focus:border-purple-500 text-sm"
          />
          <select
            value={cargoEquipe}
            onChange={(e) => setCargoEquipe(e.target.value)}
            className="w-full sm:w-[180px] bg-gray-800 p-2.5 rounded-lg text-white border border-gray-700 outline-none focus:border-purple-500 text-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="ADMIN">Admins</option>
            <option value="FUNCIONARIO">Funcionários</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        {loadingEquipeUsers && (
          <p className="text-center text-gray-400 text-sm mb-3">Carregando usuários...</p>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {(!equipeUsers || equipeUsers.length === 0) && !loadingEquipeUsers ? (
            <p className="text-center text-gray-500">Nenhum usuário encontrado.</p>
          ) : (
            equipeUsers.map((user: any) => (
              <div
                key={user.id}
                className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700 gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">{user.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {user.cargo && (
                    <p className="text-[11px] text-gray-500 mt-1">{user.cargo}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onEntrarComo(user)}
                    className="p-2 bg-blue-900/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded"
                    title="Entrar como"
                  >
                    <LogIn size={16} />
                  </button>
                  <button
                    onClick={() => resetarSenha(user)}
                    className="p-2 bg-amber-900/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded"
                    title="Resetar Senha"
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    onClick={() => excluirUsuario(user.id)}
                    className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded"
                    title="Excluir usuário"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800">
          <button
            onClick={() => {
              onOpenChange(false);
              onAbrirModalAdmin();
            }}
            className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white rounded text-sm flex justify-center gap-2"
          >
            <UserPlus size={16} /> Adicionar Novo Acesso
          </button>
        </div>
      </div>
    </div>
  );
}

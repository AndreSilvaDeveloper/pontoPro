'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UserPlus, RefreshCw, User, Pencil, Trash2, Users, Monitor, Phone, Search, X, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

import ModalFuncionario, { Funcionario } from '@/components/ModalFuncionario';

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [lojaAtual, setLojaAtual] = useState('Carregando...');
  const [buscaNome, setBuscaNome] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);

  // Confirmação inline
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState<string | null>(null);
  const [regenerandoTermos, setRegenerandoTermos] = useState(false);

  useEffect(() => {
    carregarLista();
    axios.get('/api/admin/empresa')
      .then(res => setLojaAtual(res.data.nome))
      .catch(() => setLojaAtual('Minha Empresa'));
  }, []);

  const carregarLista = async () => {
    try {
      const res = await axios.get('/api/admin/funcionarios');
      setFuncionarios(res.data);
    } catch (e) {
      console.error("Erro lista", e);
    }
  };

  const handleNovo = () => {
    setFuncionarioSelecionado(null);
    setShowModal(true);
  };

  const handleEditar = (f: Funcionario) => {
    setFuncionarioSelecionado(f);
    setShowModal(true);
  };

  const excluirFuncionario = async (id: string) => {
    try {
      await axios.delete(`/api/admin/funcionarios?id=${id}`);
      carregarLista();
      toast.success('Funcionário excluído com sucesso.');
    } catch (error) {
      toast.error('Erro ao excluir.');
    } finally {
      setConfirmandoExclusao(null);
    }
  };

  const resetarSenha = async (id: string) => {
    try {
      await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id });
      toast.success('Senha resetada! Senha padrão: 1234');
    } catch (error) {
      toast.error('Erro ao resetar.');
    } finally {
      setConfirmandoReset(null);
    }
  };

  const regenerarTermos = async () => {
    setRegenerandoTermos(true);
    try {
      const res = await axios.post('/api/admin/funcionarios/regenerar-termos');
      const { atualizados } = res.data;
      if (atualizados > 0) {
        toast.success(`${atualizados} termo(s) regenerado(s) com assinatura!`);
      } else {
        toast.info('Nenhum termo encontrado para regenerar.');
      }
    } catch {
      toast.error('Erro ao regenerar termos.');
    } finally {
      setRegenerandoTermos(false);
    }
  };

  // Filtro de busca
  const listaFiltrada = funcionarios.filter((f) => {
    if (!buscaNome.trim()) return true;
    const termo = buscaNome.trim().toLowerCase();
    return (
      f.nome.toLowerCase().includes(termo) ||
      f.email.toLowerCase().includes(termo) ||
      (f.tituloCargo || '').toLowerCase().includes(termo) ||
      (f.telefone || '').includes(termo)
    );
  });

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 space-y-5 relative z-10">

        {/* TOPO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Users size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Gestão de Equipe</h1>
              <p className="text-text-muted text-sm">{lojaAtual} &middot; {funcionarios.length} funcionário(s)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={regenerarTermos}
              disabled={regenerandoTermos}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex gap-2 items-center shadow-lg shadow-blue-900/20 transition-colors active:scale-95 disabled:opacity-50"
              title="Regenerar PDFs dos termos existentes com assinatura"
            >
              {regenerandoTermos ? <RefreshCw size={18} className="animate-spin" /> : <FileCheck size={18} />}
              <span className="hidden sm:inline">Regenerar Termos</span>
            </button>
            <button onClick={handleNovo} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex gap-2 items-center shadow-lg shadow-green-900/20 transition-colors active:scale-95">
              <UserPlus size={18} /> Novo Funcionário
            </button>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              placeholder="Buscar por nome, email, cargo ou telefone..."
              className="w-full bg-surface backdrop-blur-sm border border-border-default hover:border-white/20 focus:border-purple-500/60 outline-none rounded-2xl py-3.5 pl-12 pr-12 text-sm text-text-secondary placeholder:text-text-dim transition-colors"
            />
            {buscaNome.trim() && (
              <button
                onClick={() => setBuscaNome('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-secondary transition-colors"
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {buscaNome.trim() && (
            <p className="text-xs text-text-faint mt-2 ml-1">
              {listaFiltrada.length} resultado(s) para &quot;{buscaNome}&quot;
            </p>
          )}
        </div>

        {/* LISTAGEM */}
        <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          {funcionarios.length === 0 && !buscaNome.trim() && (
            <div className="text-center py-16 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle">
              <Users size={40} className="mx-auto text-text-dim mb-3" />
              <p className="text-text-faint font-semibold">Nenhum funcionário cadastrado.</p>
              <p className="text-text-dim text-xs mt-1">Clique em &quot;Novo Funcionário&quot; para começar.</p>
            </div>
          )}

          {funcionarios.length > 0 && listaFiltrada.length === 0 && buscaNome.trim() && (
            <div className="text-center py-10 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle">
              <Search size={32} className="mx-auto text-text-dim mb-3" />
              <p className="text-text-faint text-sm">Nenhum resultado para &quot;{buscaNome}&quot;</p>
            </div>
          )}

          {listaFiltrada.map(func => (
            <div key={func.id} className="bg-surface backdrop-blur-sm p-4 rounded-2xl border border-border-subtle flex flex-col gap-4 shadow-md hover:border-border-default transition-colors">
              <div className="flex items-center gap-4">
                {func.fotoPerfilUrl ? (
                  <Image src={func.fotoPerfilUrl} alt={func.nome} width={48} height={48} className="w-12 h-12 rounded-full object-cover border-2 border-border-default flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-elevated-solid rounded-full flex items-center justify-center border border-border-default flex-shrink-0">
                    <User size={20} className="text-text-faint" />
                  </div>
                )}
                <div className="overflow-hidden flex-1 min-w-0">
                  <h3 className="font-bold text-text-primary text-base truncate">{func.nome}</h3>
                  <p className="text-xs text-text-muted truncate">{func.email}</p>
                  {func.telefone && (
                    <p className="text-xs text-text-faint truncate flex items-center gap-1"><Phone size={10} /> {func.telefone}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {func.tituloCargo && <span className="text-[10px] bg-elevated-solid px-2 py-0.5 rounded text-purple-400 font-bold uppercase">{func.tituloCargo}</span>}
                    {func.pontoLivre && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Livre</span>}
                    {func.modoValidacaoPonto === 'PC_IP' && <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1"><Monitor size={10}/> IP Fixo</span>}
                    {(func as any).cienciaCelularDocUrl && (
                      <a href={(func as any).cienciaCelularDocUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-900/50 transition-colors">
                        Termo &middot; {(func as any).cienciaCelularOpcao === 'PROPRIO' ? 'Cel. Pessoal' : 'Cel. Empresa'}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirmação inline de exclusão */}
              {confirmandoExclusao === func.id ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <p className="text-sm text-red-300">Excluir <strong>{func.nome}</strong>?</p>
                  <div className="flex gap-2">
                    <button onClick={() => excluirFuncionario(func.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">Sim</button>
                    <button onClick={() => setConfirmandoExclusao(null)} className="px-3 py-1.5 bg-hover-bg hover:bg-hover-bg-strong text-text-secondary rounded-lg text-xs font-bold transition-colors">Não</button>
                  </div>
                </div>
              ) : confirmandoReset === func.id ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <p className="text-sm text-yellow-300">Resetar senha de <strong>{func.nome}</strong>?</p>
                  <div className="flex gap-2">
                    <button onClick={() => resetarSenha(func.id)} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-bold transition-colors">Sim</button>
                    <button onClick={() => setConfirmandoReset(null)} className="px-3 py-1.5 bg-hover-bg hover:bg-hover-bg-strong text-text-secondary rounded-lg text-xs font-bold transition-colors">Não</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
                  <button
                    onClick={() => handleEditar(func)}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 bg-hover-bg text-blue-400 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-hover-bg-strong transition-colors whitespace-nowrap active:scale-95"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>

                  <button
                    onClick={() => setConfirmandoReset(func.id)}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 bg-hover-bg text-yellow-500 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-hover-bg-strong transition-colors leading-tight active:scale-95"
                  >
                    <RefreshCw size={14} />
                    <span className="sm:hidden text-center">
                      Resetar<br />Senha
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">Resetar Senha</span>
                  </button>

                  <button
                    onClick={() => setConfirmandoExclusao(func.id)}
                    className="flex items-center justify-center gap-2 py-2.5 px-2 bg-hover-bg text-red-500 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-hover-bg-strong transition-colors whitespace-nowrap active:scale-95"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* COMPONENTE DO MODAL */}
        <ModalFuncionario
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          funcionarioEdicao={funcionarioSelecionado}
          onSuccess={carregarLista}
        />

      </div>
    </div>
  );
}

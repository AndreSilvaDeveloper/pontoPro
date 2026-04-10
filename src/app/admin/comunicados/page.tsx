'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Bell,
  Send,
  MessageSquare,
  Users,
  CheckCheck,
  AlertTriangle,
  Info,
  Megaphone,
  X,
  Loader,
  Check,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';

type Comunicado = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  autorNome: string;
  criadoEm: string;
  leituras: number;
  totalDestinatarios: number;
  paraTodos: boolean;
};

type Funcionario = { id: string; nome: string };

type DestinatarioDetalhe = { id: string; nome: string; leu: boolean };

const TIPO_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  AVISO: { label: 'Aviso', cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Bell },
  URGENTE: { label: 'Urgente', cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle },
  INFORMATIVO: { label: 'Informativo', cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info },
};

export default function ComunicadosAdmin() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<any>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Form
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('AVISO');
  const [destino, setDestino] = useState<'todos' | 'alguns'>('todos');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [buscaFunc, setBuscaFunc] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/admin/comunicados');
      setComunicados(res.data.comunicados);
      setFuncionarios(res.data.funcionarios || []);
    } catch {
      toast.error('Erro ao carregar comunicados');
    } finally {
      setCarregando(false);
    }
  };

  const verDetalhes = async (id: string) => {
    setDetalhesId(id);
    setCarregandoDetalhes(true);
    try {
      const res = await axios.get(`/api/admin/comunicados?id=${id}`);
      setDetalhes(res.data.comunicado);
    } catch {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const toggleFunc = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const filtrados = funcionarios.filter(f => !buscaFunc.trim() || f.nome.toLowerCase().includes(buscaFunc.trim().toLowerCase()));
    const todosSelecionados = filtrados.every(f => selecionados.has(f.id));
    if (todosSelecionados) {
      setSelecionados(prev => {
        const next = new Set(prev);
        filtrados.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelecionados(prev => {
        const next = new Set(prev);
        filtrados.forEach(f => next.add(f.id));
        return next;
      });
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) { toast.error('Preencha todos os campos'); return; }
    if (destino === 'alguns' && selecionados.size === 0) { toast.error('Selecione ao menos um funcionário'); return; }

    setEnviando(true);
    try {
      await axios.post('/api/admin/comunicados', {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        tipo,
        destinatarioIds: destino === 'alguns' ? Array.from(selecionados) : null,
      });
      toast.success('Comunicado enviado!');
      setModalAberto(false);
      setTitulo(''); setMensagem(''); setTipo('AVISO'); setDestino('todos'); setSelecionados(new Set()); setBuscaFunc('');
      carregar();
    } catch {
      toast.error('Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  const funcsFiltrados = funcionarios.filter(f => !buscaFunc.trim() || f.nome.toLowerCase().includes(buscaFunc.trim().toLowerCase()));

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto p-4 md:p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl border border-border-subtle transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                <Megaphone size={24} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Comunicados</h1>
                <p className="text-text-muted text-xs">Envie avisos para a equipe</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-hover-bg rounded-2xl animate-pulse" />)}
          </div>
        ) : comunicados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <MessageSquare size={32} className="text-purple-400" />
            </div>
            <p className="text-text-muted text-sm">Nenhum comunicado enviado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map(c => {
              const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.AVISO;
              const IconTipo = cfg.icon;
              return (
                <div
                  key={c.id}
                  onClick={() => verDetalhes(c.id)}
                  className="bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-5 shadow-lg hover:border-purple-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${cfg.bg} ${cfg.cor} border ${cfg.border}`}>
                        <IconTipo size={12} />
                        {cfg.label}
                      </span>
                      <h3 className="font-bold text-text-primary truncate">{c.titulo}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CheckCheck size={14} className={c.leituras === c.totalDestinatarios ? 'text-emerald-400' : 'text-purple-400'} />
                      <span className="text-xs text-text-muted font-bold">
                        {c.leituras}/{c.totalDestinatarios}
                      </span>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm line-clamp-2 mb-3">{c.mensagem}</p>
                  <div className="flex items-center justify-between text-xs text-text-faint">
                    <div className="flex items-center gap-2">
                      <span>Por {c.autorNome}</span>
                      {!c.paraTodos && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-bold">Selecionados</span>}
                    </div>
                    <span>{format(new Date(c.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detalhes - Quem leu */}
      {detalhesId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-solid border border-border-default w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle shrink-0">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Eye size={20} className="text-purple-400" /> Detalhes do comunicado
              </h3>
              <button onClick={() => { setDetalhesId(null); setDetalhes(null); }} className="text-text-faint hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            {carregandoDetalhes ? (
              <div className="p-10 flex items-center justify-center"><Loader size={24} className="animate-spin text-purple-400" /></div>
            ) : detalhes ? (
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-text-primary text-lg">{detalhes.titulo}</h4>
                  <p className="text-sm text-text-secondary mt-1">{detalhes.mensagem}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCheck size={16} className="text-purple-400" />
                  <span className="text-text-muted"><strong className="text-text-primary">{detalhes.leituras}</strong> de <strong className="text-text-primary">{detalhes.totalDestinatarios}</strong> leram</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-text-faint font-bold uppercase tracking-wider">Destinatários</p>
                  {(detalhes.destinatarios as DestinatarioDetalhe[]).map((d: DestinatarioDetalhe) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                      <span className="text-sm text-text-primary">{d.nome}</span>
                      {d.leu ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <Eye size={12} /> Leu
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-text-dim font-bold">
                          <EyeOff size={12} /> Não leu
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Novo Comunicado */}
      {modalAberto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-solid border border-border-default w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle shrink-0">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Megaphone size={20} className="text-purple-400" /> Novo Comunicado
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-text-faint hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={enviar} className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider block mb-1.5">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-page border border-border-input rounded-xl py-3 px-3 text-sm text-text-primary outline-none focus:border-purple-500 appearance-none">
                  <option value="AVISO">Aviso</option>
                  <option value="URGENTE">Urgente</option>
                  <option value="INFORMATIVO">Informativo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider block mb-1.5">Título</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Aviso sobre feriado..." className="w-full bg-page border border-border-input rounded-xl py-3 px-3 text-sm text-text-primary outline-none focus:border-purple-500" maxLength={200} />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider block mb-1.5">Mensagem</label>
                <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Escreva a mensagem..." rows={4} className="w-full bg-page border border-border-input rounded-xl py-3 px-3 text-sm text-text-primary outline-none focus:border-purple-500 resize-none" maxLength={2000} />
                <p className="text-[10px] text-text-faint mt-1 text-right">{mensagem.length}/2000</p>
              </div>

              {/* Destinatários */}
              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider block mb-1.5">Enviar para</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => { setDestino('todos'); setSelecionados(new Set()); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${destino === 'todos' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-page border border-border-input text-text-muted hover:bg-hover-bg'}`}>
                    <Users size={14} className="inline mr-1.5" />Todos ({funcionarios.length})
                  </button>
                  <button type="button" onClick={() => setDestino('alguns')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${destino === 'alguns' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-page border border-border-input text-text-muted hover:bg-hover-bg'}`}>
                    Selecionar {selecionados.size > 0 && `(${selecionados.size})`}
                  </button>
                </div>

                {destino === 'alguns' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-text-faint" />
                      <input value={buscaFunc} onChange={e => setBuscaFunc(e.target.value)} placeholder="Buscar funcionário..." className="w-full bg-page border border-border-input rounded-xl py-2.5 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-purple-500" />
                    </div>
                    {funcsFiltrados.length > 1 && (
                      <button type="button" onClick={toggleTodos} className="text-[10px] text-purple-400 font-bold hover:text-purple-300">
                        {funcsFiltrados.every(f => selecionados.has(f.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-border-subtle rounded-xl p-2">
                      {funcsFiltrados.map(f => (
                        <button key={f.id} type="button" onClick={() => toggleFunc(f.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${selecionados.has(f.id) ? 'bg-purple-500/10 text-purple-300' : 'text-text-primary hover:bg-hover-bg'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selecionados.has(f.id) ? 'bg-purple-500 border-purple-500' : 'border-border-input'}`}>
                            {selecionados.has(f.id) && <Check size={10} className="text-white" />}
                          </div>
                          {f.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={enviando || !titulo.trim() || !mensagem.trim() || (destino === 'alguns' && selecionados.size === 0)}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                {enviando ? <><Loader size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Comunicado</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, Handshake, PlusCircle, X, Save, Building2, Users, Globe, Trash2, Power, Edit3, ChevronDown, ChevronUp, Palette, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { confirmar } from '@/lib/saasUi';
import Image from 'next/image';

export default function RevendedoresPage() {
  const [revendedores, setRevendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<Record<string, any>>({});

  // Form criar
  const [nome, setNome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [dominio, setDominio] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState('');

  // Form editar
  const [editNome, setEditNome] = useState('');
  const [editNomeExibicao, setEditNomeExibicao] = useState('');
  const [editDominio, setEditDominio] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/saas/revendedores');
      setRevendedores(res.data);
    } catch { } finally { setLoading(false); }
  };

  const criar = async () => {
    if (!nome || !nomeUsuario || !emailUsuario || !senhaUsuario) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    setSalvando(true);
    try {
      await axios.post('/api/saas/revendedores', {
        nome, nomeExibicao, dominio, nomeUsuario, emailUsuario, senhaUsuario,
      });
      toast.success('Revendedor criado!');
      setModalAberto(false);
      setNome(''); setNomeExibicao(''); setDominio(''); setNomeUsuario(''); setEmailUsuario(''); setSenhaUsuario('');
      carregar();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro ao criar');
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (rev: any) => {
    try {
      await axios.put('/api/saas/revendedores', { id: rev.id, ativo: !rev.ativo });
      toast.success(rev.ativo ? 'Revendedor desativado' : 'Revendedor ativado');
      carregar();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro');
    }
  };

  const excluir = async (rev: any) => {
    const ok = await confirmar({
      titulo: `Excluir ${rev.nome}?`,
      mensagem: `As ${rev.totalEmpresas} empresa${rev.totalEmpresas === 1 ? '' : 's'} ser${rev.totalEmpresas === 1 ? 'á' : 'ão'} desvinculada${rev.totalEmpresas === 1 ? '' : 's'} (não excluída${rev.totalEmpresas === 1 ? '' : 's'}).`,
      perigo: true,
      labelConfirmar: 'Excluir',
    });
    if (!ok) return;
    setExcluindoId(rev.id);
    try {
      await axios.delete('/api/saas/revendedores', { data: { id: rev.id } });
      toast.success('Revendedor excluido');
      carregar();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro ao excluir');
    } finally {
      setExcluindoId(null);
    }
  };

  const abrirEdicao = (rev: any) => {
    setEditandoId(rev.id);
    setEditNome(rev.nome);
    setEditNomeExibicao(rev.nomeExibicao || '');
    setEditDominio(rev.dominio || '');
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    setSalvando(true);
    try {
      await axios.put('/api/saas/revendedores', {
        id: editandoId, nome: editNome, nomeExibicao: editNomeExibicao, dominio: editDominio,
      });
      toast.success('Atualizado!');
      setEditandoId(null);
      carregar();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/saas" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Handshake size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Revendedores</h1>
              <p className="text-xs text-text-faint">Gerencie parceiros White Label</p>
            </div>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <PlusCircle size={16} /> Novo
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-text-muted">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revendedores.length === 0 ? (
          <div className="text-center py-16 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle">
            <Handshake size={40} className="text-text-dim mx-auto mb-4" />
            <p className="text-text-faint">Nenhum revendedor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {revendedores.map((rev: any) => {
              const isExpanded = expandidoId === rev.id;
              const isEditing = editandoId === rev.id;

              return (
                <div key={rev.id} className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle overflow-hidden">
                  {/* Header do card */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {rev.logoUrl ? (
                        <Image src={rev.logoUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-contain border border-border-default" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (rev.corPrimaria || '#7c3aed') + '20' }}>
                          <Palette size={18} style={{ color: rev.corPrimaria || '#7c3aed' }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-text-primary truncate">{rev.nome}</h3>
                          {rev.nomeExibicao && rev.nomeExibicao !== rev.nome && (
                            <span className="text-xs text-text-faint">({rev.nomeExibicao})</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            rev.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>{rev.ativo ? 'ATIVO' : 'INATIVO'}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-muted mt-0.5">
                          <span className="flex items-center gap-1"><Building2 size={12} /> {rev.totalEmpresas} empresas</span>
                          {rev.dominio && <span className="flex items-center gap-1"><Globe size={12} /> {rev.dominio}</span>}
                          {rev.usuarios?.[0] && <span className="text-text-dim">{rev.usuarios[0].email}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Acoes */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => abrirEdicao(rev)} className="p-2 rounded-lg text-text-faint hover:text-purple-400 hover:bg-purple-500/10 transition-all" title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => toggleAtivo(rev)} className={`p-2 rounded-lg transition-all ${rev.ativo ? 'text-text-faint hover:text-amber-400 hover:bg-amber-500/10' : 'text-text-faint hover:text-emerald-400 hover:bg-emerald-500/10'}`} title={rev.ativo ? 'Desativar' : 'Ativar'}>
                        <Power size={16} />
                      </button>
                      <button onClick={() => excluir(rev)} disabled={excluindoId === rev.id} className="p-2 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => {
                        const newId = isExpanded ? null : rev.id;
                        setExpandidoId(newId);
                        if (newId && !billingData[newId]) {
                          axios.get(`/api/saas/revendedores/billing?id=${newId}`)
                            .then(res => setBillingData(prev => ({ ...prev, [newId]: res.data })))
                            .catch(() => {});
                        }
                      }} className="p-2 rounded-lg text-text-faint hover:text-text-primary hover:bg-hover-bg transition-all" title="Ver detalhes">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Edicao inline */}
                  {isEditing && (
                    <div className="px-5 pb-5 border-t border-border-subtle pt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome</label>
                          <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
                            className="w-full bg-page border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:border-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome exibicao</label>
                          <input type="text" value={editNomeExibicao} onChange={e => setEditNomeExibicao(e.target.value)}
                            className="w-full bg-page border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:border-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Dominio</label>
                          <input type="text" value={editDominio} onChange={e => setEditDominio(e.target.value)} placeholder="empresa.com.br"
                            className="w-full bg-page border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:border-purple-500" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditandoId(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-hover-bg border border-border-subtle">Cancelar</button>
                        <button onClick={salvarEdicao} disabled={salvando} className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50">
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="border-t border-border-subtle animate-in fade-in slide-in-from-top-2">
                      {/* Billing */}
                      {billingData[rev.id]?.fatura && (
                        <div className="px-5 py-4 bg-emerald-500/5 border-b border-border-subtle">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} className="text-emerald-400" />
                              <span className="text-xs font-bold text-text-primary">Fatura Mensal</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-400">
                              R$ {billingData[rev.id].fatura.total.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {billingData[rev.id].fatura.detalheFaixas.map((f: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="text-text-muted">{f.qtd} x R$ {f.valorUnit.toFixed(2).replace('.', ',')}/usr ({f.faixa})</span>
                                <span className="text-text-primary font-mono">R$ {f.subtotal.toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-text-dim mt-2">
                            {billingData[rev.id].totalUsuarios} usuarios em {billingData[rev.id].totalEmpresas} empresas ativas
                            {billingData[rev.id].fatura.subtotal < billingData[rev.id].fatura.minimoMensal && ' (minimo mensal aplicado)'}
                          </p>
                        </div>
                      )}

                      {/* Empresas */}
                      {rev.empresas.length === 0 ? (
                        <div className="p-5 text-center text-text-faint text-sm">Nenhuma empresa vinculada</div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {rev.empresas.map((emp: any) => (
                            <div key={emp.id} className="px-5 py-3 flex items-center justify-between hover:bg-hover-bg/50 transition-colors">
                              <div>
                                <span className="font-semibold text-text-primary text-sm">{emp.nome}</span>
                                <span className="text-xs text-text-faint ml-2">{emp.totalUsuarios} usuarios</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400">{emp.plano}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                  emp.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>{emp.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal criar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative z-10 w-full max-w-md bg-page border border-border-input rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-page border-b border-border-subtle px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Handshake size={18} className="text-purple-400" /> Novo Revendedor
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-1.5 text-text-faint hover:text-text-primary rounded-lg hover:bg-hover-bg">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70dvh] overflow-y-auto">
              <p className="text-[10px] text-text-faint font-bold uppercase tracking-wider">Dados do revendedor</p>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: PontoMax"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome de exibicao</label>
                <input type="text" value={nomeExibicao} onChange={e => setNomeExibicao(e.target.value)} placeholder="Ex: PontoMax RH"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Dominio (opcional)</label>
                <input type="text" value={dominio} onChange={e => setDominio(e.target.value)} placeholder="pontomax.com.br"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <hr className="border-border-subtle" />
              <p className="text-[10px] text-text-faint font-bold uppercase tracking-wider">Usuario de acesso</p>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome *</label>
                <input type="text" value={nomeUsuario} onChange={e => setNomeUsuario(e.target.value)} placeholder="Nome do responsavel"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Email *</label>
                <input type="email" value={emailUsuario} onChange={e => setEmailUsuario(e.target.value)} placeholder="contato@pontomax.com.br"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Senha *</label>
                <input type="text" value={senhaUsuario} onChange={e => setSenhaUsuario(e.target.value)} placeholder="Senha de acesso"
                  className="w-full bg-page border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <button onClick={criar} disabled={salvando}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                {salvando ? 'Criando...' : <><Save size={18} /> Criar Revendedor</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

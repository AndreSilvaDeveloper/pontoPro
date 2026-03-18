'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Building2, PlusCircle, X, Save, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RevendedorEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [plano, setPlano] = useState('PROFESSIONAL');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/revendedor/empresas');
      setEmpresas(res.data);
    } catch { } finally { setLoading(false); }
  };

  const criarEmpresa = async () => {
    if (!nomeEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }

    setSalvando(true);
    try {
      await axios.post('/api/revendedor/empresas', {
        nomeEmpresa, cnpj, nomeAdmin, emailAdmin, senhaAdmin, plano,
      });
      toast.success('Empresa criada com sucesso!');
      setModalAberto(false);
      setNomeEmpresa(''); setCnpj(''); setNomeAdmin(''); setEmailAdmin(''); setSenhaAdmin('');
      carregar();
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro ao criar empresa');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/revendedor" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Building2 size={24} className="text-purple-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Empresas</h1>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <PlusCircle size={16} /> Nova Empresa
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-text-muted">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-16 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle">
            <Building2 size={40} className="text-text-dim mx-auto mb-4" />
            <p className="text-text-faint">Nenhuma empresa cadastrada</p>
            <p className="text-text-dim text-xs mt-1">Clique em &quot;Nova Empresa&quot; para comecar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {empresas.map((emp: any) => (
              <div key={emp.id} className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-text-primary">{emp.nome}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      emp.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>{emp.status}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400">{emp.plano}</span>
                  </div>
                  {emp.cnpj && <p className="text-xs text-text-faint">CNPJ: {emp.cnpj}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Users size={12} /> {emp.totalUsuarios} usuarios</span>
                    {emp.admins?.map((adm: any) => (
                      <span key={adm.id} className="text-text-faint">Admin: {adm.nome}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar empresa */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative z-10 w-full max-w-md bg-page border border-border-input rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-surface/60 border-b border-border-subtle px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <PlusCircle size={18} className="text-purple-400" /> Nova Empresa
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-1.5 text-text-faint hover:text-text-primary rounded-lg hover:bg-hover-bg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70dvh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome da Empresa *</label>
                <input type="text" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} placeholder="Ex: Padaria do Joao"
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">CNPJ (opcional)</label>
                <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00"
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Plano</label>
                <select value={plano} onChange={e => setPlano(e.target.value)}
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500 appearance-none">
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <hr className="border-border-subtle" />
              <p className="text-[10px] text-text-faint font-bold uppercase tracking-wider">Administrador da empresa</p>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Nome *</label>
                <input type="text" value={nomeAdmin} onChange={e => setNomeAdmin(e.target.value)} placeholder="Nome completo"
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Email *</label>
                <input type="email" value={emailAdmin} onChange={e => setEmailAdmin(e.target.value)} placeholder="admin@empresa.com"
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Senha *</label>
                <input type="text" value={senhaAdmin} onChange={e => setSenhaAdmin(e.target.value)} placeholder="Senha inicial"
                  className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <button
                onClick={criarEmpresa}
                disabled={salvando}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {salvando ? 'Criando...' : <><Save size={18} /> Criar Empresa</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Building2, Users, Palette, PlusCircle, LogOut, LayoutDashboard, Settings, DollarSign } from 'lucide-react';

export default function RevendedorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/revendedor/dashboard'),
      axios.get('/api/revendedor/billing').catch(() => ({ data: null })),
    ]).then(([resDash, resBill]) => {
      setData(resDash.data);
      setBilling(resBill.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center text-text-muted gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Carregando painel...
      </div>
    );
  }

  const rev = data?.revendedor;
  const stats = data?.stats;
  const empresas = data?.empresas || [];

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-8 space-y-8 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
              <LayoutDashboard size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {rev?.nomeExibicao || rev?.nome || 'Revendedor'}
              </h1>
              <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Painel do Revendedor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/revendedor/configuracoes"
              className="p-2.5 hover:bg-hover-bg-strong rounded-lg text-text-muted hover:text-text-primary transition-colors border border-border-subtle"
              title="Configurações"
            >
              <Settings size={18} />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2.5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-lg transition-colors border border-border-subtle"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-purple-400" />
              <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Empresas</h3>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats?.totalEmpresas || 0}</p>
            <p className="text-xs text-text-faint mt-1">{stats?.empresasAtivas || 0} ativas</p>
          </div>

          <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-emerald-400" />
              <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Usuarios</h3>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats?.totalUsuarios || 0}</p>
          </div>

          <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Palette size={16} className="text-orange-400" />
              <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Marca</h3>
            </div>
            <p className="text-lg font-bold text-text-primary truncate">{rev?.nomeExibicao || 'Configurar'}</p>
          </div>
        </div>

        {/* Fatura */}
        {billing?.fatura && (
          <div className="bg-surface backdrop-blur-md rounded-2xl border border-border-subtle shadow-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Fatura Mensal Estimada</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                R$ {billing.fatura.total.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="space-y-1.5">
              {billing.fatura.detalheFaixas.map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{f.qtd} usuarios x R$ {f.valorUnit.toFixed(2).replace('.', ',')}</span>
                  <span className="text-text-primary font-mono">R$ {f.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              {billing.fatura.subtotal < billing.fatura.minimoMensal && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle">
                  <span className="text-text-faint">Minimo mensal aplicado</span>
                  <span className="text-text-muted font-mono">R$ {billing.fatura.minimoMensal.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-text-dim">
              {billing.totalUsuarios} usuarios em {billing.totalEmpresas} empresas ativas
            </p>
          </div>
        )}

        {/* Acoes rapidas */}
        <div className="flex gap-3">
          <Link
            href="/revendedor/empresas"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <PlusCircle size={18} /> Nova Empresa
          </Link>
          <Link
            href="/revendedor/configuracoes"
            className="flex items-center gap-2 px-4 py-3 bg-surface hover:bg-elevated-solid border border-border-subtle rounded-xl font-bold text-sm text-text-secondary transition-all active:scale-95"
          >
            <Palette size={18} /> Marca Branca
          </Link>
        </div>

        {/* Lista de empresas */}
        <div className="bg-page backdrop-blur-xl border border-border-subtle rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary">Suas Empresas</h3>
          </div>

          {empresas.length === 0 ? (
            <div className="p-12 text-center text-text-faint text-sm">
              Nenhuma empresa cadastrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {empresas.map((emp: any) => (
                <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-hover-bg transition-colors">
                  <div>
                    <h4 className="font-semibold text-text-primary text-sm">{emp.nome}</h4>
                    <p className="text-xs text-text-faint">
                      {emp.totalUsuarios} usuarios · {emp.plano}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    emp.status === 'ATIVO'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {emp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

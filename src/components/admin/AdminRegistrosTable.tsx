'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import { Calendar, FileText, Filter, Trash2, User, Edit2, Scale } from 'lucide-react';
import type { RegistroUnificado } from '@/types/registro';

export default function AdminRegistrosTable(props: {
  registrosFiltrados: RegistroUnificado[];
  abrirModalEdicao: (reg: RegistroUnificado) => void;
  excluirPonto: (reg: RegistroUnificado) => void;
  excluirAusencia: (reg: RegistroUnificado) => void;
  excluirAjuste?: (reg: RegistroUnificado) => void;
}) {
  const { registrosFiltrados, abrirModalEdicao, excluirPonto, excluirAusencia, excluirAjuste } = props;

  const isFolgaParcial = (reg: any) => {
    if (!reg || reg.tipo !== 'AUSENCIA') return false;
    if (!reg.subTipo) return false;
    if (!reg.extra?.dataFim) return false;

    const ini = new Date(reg.dataHora);
    const fim = new Date(reg.extra.dataFim);

    const mesmoDia = format(ini, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd');
    if (!mesmoDia) return false;

    const iniMin = ini.getHours() * 60 + ini.getMinutes();
    const fimMin = fim.getHours() * 60 + fim.getMinutes();

    if (iniMin === fimMin) return false;
    if (fimMin <= iniMin) return false;

    return true;
  };

  return (
    <div className="bg-surface/40 backdrop-blur-xl rounded-3xl border border-border-subtle overflow-hidden shadow-2xl">
      <div className="hidden md:grid grid-cols-5 bg-page p-4 text-[10px] font-bold text-text-faint uppercase tracking-widest border-b border-border-subtle">
        <div className="pl-2">Funcionário</div>
        <div>Data</div>
        <div>Hora / Tipo</div>
        <div>Local / Motivo</div>
        <div className="text-right pr-2">Comprovante</div>
      </div>

      <div className="divide-y divide-white/5">
        {registrosFiltrados.length > 0 ? (
          registrosFiltrados.map((reg) => (
            <div
              key={reg.id}
              className={`p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 transition-all hover:bg-white/[0.02] group ${
                reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/5 hover:bg-yellow-900/10' : reg.tipo === 'AJUSTE_BANCO' ? 'bg-purple-900/5 hover:bg-purple-900/10' : ''
              }`}
            >
              {/* User */}
              <div className="flex items-center gap-3 pl-2">
                {reg.tipo === 'AJUSTE_BANCO' ? (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-purple-500/20 text-purple-300">
                    <Scale size={16} />
                  </div>
                ) : reg.usuario.fotoPerfilUrl ? (
                  <Image
                    src={reg.usuario.fotoPerfilUrl}
                    alt={reg.usuario.nome}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-lg border border-border-default"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                      reg.tipo === 'AUSENCIA'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {reg.tipo === 'AUSENCIA' ? <FileText size={16} /> : <User size={16} />}
                  </div>
                )}
                <div>
                  <p className="font-bold text-text-secondary text-sm">{reg.usuario.nome}</p>
                  <p className="text-[10px] text-text-faint truncate max-w-[120px]">{reg.usuario.email}</p>
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar size={14} className="md:hidden text-text-faint" />
                <span className="text-sm font-semibold tracking-tight">
                  {format(new Date(reg.dataHora), 'dd/MM/yyyy')}
                </span>
                {reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-elevated-solid rounded text-text-muted">
                    até {format(new Date(reg.extra.dataFim), 'dd/MM')}
                  </span>
                )}
              </div>

              {/* Hora / Tipo */}
              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                {reg.tipo === 'AJUSTE_BANCO' ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded border ${
                      (reg.extra?.minutos || 0) < 0
                        ? 'text-red-400 bg-red-900/20 border-red-500/20'
                        : 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20'
                    }`}>
                      {(() => {
                        const min = reg.extra?.minutos || 0;
                        const h = Math.floor(Math.abs(min) / 60);
                        const m = Math.abs(min) % 60;
                        return `${min < 0 ? '-' : '+'}${h}h${String(m).padStart(2, '0')}`;
                      })()}
                    </span>
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wide">
                      {reg.subTipo === 'COMPENSACAO_FOLGA' ? 'Compensação' : reg.subTipo === 'PAGAMENTO_HE' ? 'Pagamento HE' : 'Correção'}
                    </span>
                    {excluirAjuste && (
                      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-1">
                        <button
                          onClick={() => excluirAjuste(reg)}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-xs font-bold md:p-1"
                          title="Excluir ajuste"
                        >
                          <Trash2 size={14} /> <span className="md:hidden">Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : reg.tipo === 'PONTO' ? (
                  <>
                    <span className="text-sm font-bold text-emerald-400 font-mono bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20">
                      {format(new Date(reg.dataHora), 'HH:mm')}
                    </span>

                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-text-faint uppercase tracking-wide">
                        {reg.subTipo?.replace('_', ' ')}
                      </span>

                      <div className="flex gap-3 mt-1 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirModalEdicao(reg)}
                          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors text-xs font-bold md:p-1"
                          title="Editar"
                        >
                          <Edit2 size={14} /> <span className="md:hidden">Editar</span>
                        </button>

                        <button
                          onClick={() => excluirPonto(reg)}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-xs font-bold md:p-1"
                          title="Excluir"
                        >
                          <Trash2 size={14} /> <span className="md:hidden">Excluir</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* ✅ NOVO: mostrar HH:mm–HH:mm quando for FOLGA parcial */}
                    {isFolgaParcial(reg) && (
                      <span className="text-sm font-bold text-amber-400 font-mono bg-amber-900/20 px-2 py-0.5 rounded border border-amber-500/20">
                        {format(new Date(reg.dataHora), 'HH:mm')}–{format(new Date(reg.extra.dataFim!), 'HH:mm')}
                      </span>
                    )}

                    <span className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded uppercase tracking-wider">
                      {reg.subTipo?.replace('_', ' ')}
                    </span>

                    <div className="flex gap-2 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => excluirAusencia(reg)}
                        className="text-red-400 hover:text-red-300 transition-colors font-bold md:p-1"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Local */}
              <div className="flex items-center gap-2 text-text-muted text-xs truncate pr-4">
                {reg.descricao ? (
                  <span className="truncate" title={reg.descricao}>
                    {reg.descricao}
                  </span>
                ) : (
                  <span className="italic opacity-50">
                    {reg.tipo === 'PONTO' ? (reg.extra?.fotoUrl ? 'GPS + Foto' : 'GPS') : '-'}
                  </span>
                )}
              </div>

              {/* Comprovante */}
              <div className="md:text-right pr-2">
                {reg.tipo === 'AUSENCIA' && reg.extra?.comprovanteUrl && (
                  <a
                    href={reg.extra.comprovanteUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-elevated-solid hover:bg-elevated-solid text-text-secondary rounded-lg text-xs font-medium transition-all border border-border-subtle"
                  >
                    <FileText size={12} /> Ver Anexo
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-elevated rounded-full flex items-center justify-center text-text-dim">
              <Filter size={32} />
            </div>
            <p className="text-text-faint text-sm">Nenhum registro encontrado para este período.</p>
          </div>
        )}
      </div>
    </div>
  );
}

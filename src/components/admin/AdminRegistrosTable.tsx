'use client';

import { format } from 'date-fns';
import { Calendar, FileText, Filter, Trash2, User, Edit2 } from 'lucide-react';

export default function AdminRegistrosTable(props: {
  registrosFiltrados: any[];
  abrirModalEdicao: (reg: any) => void;
  excluirPonto: (reg: any) => void;
  excluirAusencia: (reg: any) => void;
}) {
  const { registrosFiltrados, abrirModalEdicao, excluirPonto, excluirAusencia } = props;

  const isFolgaParcial = (reg: any) => {
    if (!reg || reg.tipo !== 'AUSENCIA') return false;
    if (reg.subTipo !== 'FOLGA') return false;
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
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="hidden md:grid grid-cols-5 bg-slate-950/50 p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
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
                reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/5 hover:bg-yellow-900/10' : ''
              }`}
            >
              {/* User */}
              <div className="flex items-center gap-3 pl-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                    reg.tipo === 'AUSENCIA'
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {reg.tipo === 'AUSENCIA' ? <FileText size={16} /> : <User size={16} />}
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-sm">{reg.usuario.nome}</p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{reg.usuario.email}</p>
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={14} className="md:hidden text-slate-500" />
                <span className="text-sm font-semibold tracking-tight">
                  {format(new Date(reg.dataHora), 'dd/MM/yyyy')}
                </span>
                {reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                    até {format(new Date(reg.extra.dataFim), 'dd/MM')}
                  </span>
                )}
              </div>

              {/* Hora / Tipo */}
              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                {reg.tipo === 'PONTO' ? (
                  <>
                    <span className="text-sm font-bold text-emerald-400 font-mono bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20">
                      {format(new Date(reg.dataHora), 'HH:mm')}
                    </span>

                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
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
                      <span className="text-sm font-bold text-yellow-300 font-mono bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-600/20">
                        {format(new Date(reg.dataHora), 'HH:mm')}–{format(new Date(reg.extra.dataFim), 'HH:mm')}
                      </span>
                    )}

                    <span className="text-xs font-bold bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 px-2 py-1 rounded uppercase tracking-wider">
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
              <div className="flex items-center gap-2 text-slate-400 text-xs truncate pr-4">
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all border border-white/5"
                  >
                    <FileText size={12} /> Ver Anexo
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600">
              <Filter size={32} />
            </div>
            <p className="text-slate-500 text-sm">Nenhum registro encontrado para este período.</p>
          </div>
        )}
      </div>
    </div>
  );
}

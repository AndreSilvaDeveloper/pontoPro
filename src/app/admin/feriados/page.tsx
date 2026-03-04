'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, Plus, ArrowLeft, DownloadCloud, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

const PARCIAL_MARK = '__PARCIAL__:';

type FeriadoDTO = {
  id: string;
  nome: string;
  data: string;
  dataISO: string;
  empresaId?: string | null;
  criadoEm: string;
};

function isValidTimeHHMM(v: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function buildNomeComParcial(nome: string, horaInicio: string, horaFim: string) {
  const base = (nome || '').replace(new RegExp(`\\s*${PARCIAL_MARK}.*$`), '').trim();
  return `${base} ${PARCIAL_MARK}${horaInicio}-${horaFim}`.trim();
}

function parseParcialFromNome(nome: string): { baseNome: string; horaInicio?: string; horaFim?: string } {
  if (!nome) return { baseNome: '' };
  const idx = nome.indexOf(PARCIAL_MARK);
  if (idx === -1) return { baseNome: nome };

  const baseNome = nome.slice(0, idx).trim();
  const rest = nome.slice(idx + PARCIAL_MARK.length).trim();
  const [h1, h2] = rest.split('-').map((s) => (s || '').trim());

  if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) {
    return { baseNome, horaInicio: h1, horaFim: h2 };
  }

  return { baseNome };
}

function dateFromISO(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

export default function GestaoFeriados() {
  const [feriados, setFeriados] = useState<FeriadoDTO[]>([]);
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);

  const [parcial, setParcial] = useState(false);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');

  // Confirmação inline
  const [confirmandoImportacao, setConfirmandoImportacao] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const res = await axios.get<FeriadoDTO[]>('/api/admin/feriados');
    setFeriados(res.data);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !nome) return;

    if (parcial) {
      if (!isValidTimeHHMM(horaInicio) || !isValidTimeHHMM(horaFim)) {
        toast.error('Horário inválido. Use HH:mm');
        return;
      }
      const ini = Number(horaInicio.slice(0, 2)) * 60 + Number(horaInicio.slice(3, 5));
      const fim = Number(horaFim.slice(0, 2)) * 60 + Number(horaFim.slice(3, 5));
      if (fim <= ini) {
        toast.error('Hora fim precisa ser maior que a hora início.');
        return;
      }
    }

    setLoading(true);
    try {
      const nomeFinal = parcial ? buildNomeComParcial(nome, horaInicio, horaFim) : nome;

      await axios.post('/api/admin/feriados', { data, nome: nomeFinal });

      setData('');
      setNome('');
      setParcial(false);
      setHoraInicio('08:00');
      setHoraFim('12:00');

      await carregar();
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const importarAutomatico = async () => {
    const anoAtual = new Date().getFullYear();
    setImportando(true);
    setConfirmandoImportacao(false);
    try {
      await axios.post('/api/admin/feriados/importar', { ano: anoAtual });
      const res = await axios.post('/api/admin/feriados/importar', { ano: anoAtual + 1 });

      toast.success((res.data as any)?.message || 'Feriados importados com sucesso!');
      await carregar();
    } catch (error) {
      toast.error('Erro ao conectar com a Brasil API.');
    } finally {
      setImportando(false);
    }
  };

  const excluir = async (id: string) => {
    try {
      await axios.delete(`/api/admin/feriados?id=${id}`);
      await carregar();
    } catch (error) {
      toast.error('Erro ao excluir feriado.');
    } finally {
      setConfirmandoExclusao(null);
    }
  };

  const anoAtual = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">

        {/* CABEÇALHO */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Calendar size={24} className="text-purple-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Gestão de Feriados</h1>
          </div>
        </div>

        {/* BOTÃO IMPORTAÇÃO com confirmação inline */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
          {confirmandoImportacao ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-blue-300">
                Deseja importar automaticamente os feriados nacionais de <strong>{anoAtual}</strong> e <strong>{anoAtual + 1}</strong>?
              </p>
              <div className="flex gap-2">
                <button onClick={importarAutomatico} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  <DownloadCloud size={18} /> Sim, importar
                </button>
                <button onClick={() => setConfirmandoImportacao(false)} className="px-4 py-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-secondary rounded-xl font-bold text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmandoImportacao(true)}
              disabled={importando}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {importando ? <Loader size={20} className="animate-spin" /> : <DownloadCloud size={20} />}
              {importando ? 'Buscando na Brasil API...' : 'Importar Feriados Nacionais Automaticamente'}
            </button>
          )}
        </div>

        {/* Formulário Manual */}
        <div className="bg-surface backdrop-blur-sm p-4 rounded-2xl border border-border-subtle space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <p className="text-xs text-text-faint uppercase font-bold">Adicionar Feriado Local (Manual)</p>

          <form onSubmit={salvar} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-text-faint mb-1 block">Nome (ex: Aniversário da Cidade)</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-input-solid/50 border border-border-default p-2.5 rounded-xl text-text-primary focus:border-purple-500 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-text-faint mb-1 block">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="bg-input-solid/50 border border-border-default p-2.5 rounded-xl text-text-primary focus:border-purple-500 outline-none transition-colors"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors active:scale-95"
                title="Adicionar"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Parcial */}
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={parcial}
                  onChange={(e) => setParcial(e.target.checked)}
                  className="accent-purple-500"
                />
                Feriado parcial (abonar só algumas horas)
              </label>

              {parcial && (
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Hora início</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="bg-input-solid/50 border border-border-default p-2.5 rounded-xl text-text-primary focus:border-purple-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-text-faint mb-1 block">Hora fim</label>
                    <input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="bg-input-solid/50 border border-border-default p-2.5 rounded-xl text-text-primary focus:border-purple-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="text-[11px] text-text-faint pb-2">Ex: Quarta-feira de Cinzas (08:00–12:00)</div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Lista de feriados */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
          {feriados.map((f) => {
            const parsed = parseParcialFromNome(f.nome);
            const d = dateFromISO(f.dataISO);

            return (
              <div key={f.id}>
                {confirmandoExclusao === f.id ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <p className="text-sm text-red-300">Excluir este feriado?</p>
                    <div className="flex gap-2">
                      <button onClick={() => excluir(f.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors">Sim</button>
                      <button onClick={() => setConfirmandoExclusao(null)} className="px-3 py-1.5 bg-hover-bg hover:bg-hover-bg-strong text-text-secondary rounded-xl text-xs font-bold transition-colors">Não</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface backdrop-blur-sm p-4 rounded-2xl border border-border-subtle flex justify-between items-center group hover:border-border-default transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-900/50 text-purple-300 p-2 rounded-xl font-bold text-sm text-center min-w-[60px] flex flex-col">
                        <span className="text-lg">{format(d, 'dd', { locale: ptBR })}</span>
                        <span className="text-[10px] uppercase">{format(d, 'MMM', { locale: ptBR })}</span>
                      </div>

                      <div>
                        <span className="font-bold text-lg block text-text-primary">
                          {parsed.baseNome || f.nome}
                          {parsed.horaInicio && parsed.horaFim && (
                            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300 border border-yellow-600/30">
                              Parcial {parsed.horaInicio}–{parsed.horaFim}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-text-faint">{format(d, 'yyyy', { locale: ptBR })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmandoExclusao(f.id)}
                      className="text-text-faint hover:text-red-400 p-2 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {feriados.length === 0 && <p className="text-center text-text-faint py-4">Nenhum feriado cadastrado.</p>}
        </div>
      </div>
    </div>
  );
}

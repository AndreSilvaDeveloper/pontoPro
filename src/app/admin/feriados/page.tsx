'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, Plus, ArrowLeft, DownloadCloud, Loader } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

const PARCIAL_MARK = '__PARCIAL__:';

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
  const rest = nome.slice(idx + PARCIAL_MARK.length).trim(); // "08:00-12:00"
  const [h1, h2] = rest.split('-').map((s) => (s || '').trim());

  if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) {
    return { baseNome, horaInicio: h1, horaFim: h2 };
  }

  return { baseNome };
}

export default function GestaoFeriados() {
  const [feriados, setFeriados] = useState<any[]>([]);
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);

  // ✅ NOVO: feriado parcial
  const [parcial, setParcial] = useState(false);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const res = await axios.get('/api/admin/feriados');
    setFeriados(res.data);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !nome) return;

    if (parcial) {
      if (!isValidTimeHHMM(horaInicio) || !isValidTimeHHMM(horaFim)) {
        alert('Horário inválido. Use HH:mm');
        return;
      }
      // valida fim > inicio
      const ini = Number(horaInicio.slice(0, 2)) * 60 + Number(horaInicio.slice(3, 5));
      const fim = Number(horaFim.slice(0, 2)) * 60 + Number(horaFim.slice(3, 5));
      if (fim <= ini) {
        alert('Hora fim precisa ser maior que a hora início.');
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

      carregar();
    } catch (error) {
      alert('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const importarAutomatico = async () => {
    const anoAtual = new Date().getFullYear();
    if (!confirm(`Deseja importar automaticamente os feriados nacionais de ${anoAtual} e ${anoAtual + 1}?`)) return;

    setImportando(true);
    try {
      // Importa ano atual
      await axios.post('/api/admin/feriados/importar', { ano: anoAtual });
      // Importa próximo ano (para garantir planejamento)
      const res = await axios.post('/api/admin/feriados/importar', { ano: anoAtual + 1 });

      alert(res.data.message || 'Feriados importados com sucesso!');
      carregar();
    } catch (error) {
      alert('Erro ao conectar com a Brasil API.');
    } finally {
      setImportando(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir este feriado?')) return;
    await axios.delete(`/api/admin/feriados?id=${id}`);
    carregar();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-purple-400" />
            <h1 className="text-2xl font-bold">Gestão de Feriados</h1>
          </div>
          <Link href="/admin" className="text-slate-400 hover:text-white flex gap-2 items-center">
            <ArrowLeft size={20} /> Voltar
          </Link>
        </div>

        {/* BOTÃO MÁGICO DE IMPORTAÇÃO */}
        <button
          onClick={importarAutomatico}
          disabled={importando}
          className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-4"
        >
          {importando ? <Loader size={20} className="animate-spin" /> : <DownloadCloud size={20} />}
          {importando ? 'Buscando na Brasil API...' : 'Importar Feriados Nacionais Automaticamente'}
        </button>

        {/* Formulário Manual (Para feriados locais/municipais) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <p className="text-xs text-slate-500 uppercase font-bold">Adicionar Feriado Local (Manual)</p>

          <form onSubmit={salvar} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Nome (ex: Aniversário da Cidade)</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="bg-slate-950 border border-slate-700 p-2 rounded text-white"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-lg flex items-center gap-2 font-bold"
                title="Adicionar"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* ✅ NOVO: parcial */}
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
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
                    <label className="text-xs text-slate-500 mb-1 block">Hora início</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="bg-slate-950 border border-slate-700 p-2 rounded text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Hora fim</label>
                    <input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="bg-slate-950 border border-slate-700 p-2 rounded text-white"
                      required
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 pb-2">
                    Ex: Quarta-feira de Cinzas (08:00–12:00)
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-2">
          {feriados.map((f) => {
            const parsed = parseParcialFromNome(f.nome);
            return (
              <div
                key={f.id}
                className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-900/50 text-purple-300 p-2 rounded font-bold text-sm text-center min-w-[60px] flex flex-col">
                    <span className="text-lg">{format(new Date(f.data), 'dd')}</span>
                    <span className="text-[10px] uppercase">{format(new Date(f.data), 'MMM')}</span>
                  </div>

                  <div>
                    <span className="font-bold text-lg block text-white">
                      {parsed.baseNome || f.nome}
                      {parsed.horaInicio && parsed.horaFim && (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300 border border-yellow-600/30">
                          Parcial {parsed.horaInicio}–{parsed.horaFim}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500">{format(new Date(f.data), 'yyyy')}</span>
                  </div>
                </div>

                <button
                  onClick={() => excluir(f.id)}
                  className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}

          {feriados.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum feriado cadastrado.</p>}
        </div>
      </div>
    </div>
  );
}

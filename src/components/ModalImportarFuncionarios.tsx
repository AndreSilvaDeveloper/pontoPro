'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Users,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

interface ModalImportarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Resultado {
  linha: number;
  nome: string;
  email: string;
  valido: boolean;
  erro?: string;
}

interface FuncionarioRow {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  horario: string;
  sabado: string;
}

function parseCSV(text: string): FuncionarioRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detecta separador (vírgula ou ponto-e-vírgula)
  const header = lines[0];
  const sep = header.includes(';') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const cols = parseLine(header).map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  // Mapeia colunas pelo nome (flexível)
  const iNome = cols.findIndex(c => c === 'nome' || c === 'name' || c === 'nome completo');
  const iEmail = cols.findIndex(c => c === 'email' || c === 'e-mail' || c === 'login');
  const iTel = cols.findIndex(c => c === 'telefone' || c === 'celular' || c === 'whatsapp' || c === 'tel' || c === 'phone');
  const iCargo = cols.findIndex(c => c === 'cargo' || c === 'funcao' || c === 'titulo' || c === 'role');
  const iHorario = cols.findIndex(c => c === 'horario' || c === 'jornada' || c === 'schedule' || c === 'horários');
  const iSabado = cols.findIndex(c => c === 'sabado' || c === 'sábado' || c === 'saturday' || c === 'horario sabado' || c === 'horário sábado');

  if (iNome === -1 && iEmail === -1) return [];

  const rows: FuncionarioRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.every(v => !v)) continue;

    rows.push({
      nome: iNome >= 0 ? (vals[iNome] || '') : '',
      email: iEmail >= 0 ? (vals[iEmail] || '') : '',
      telefone: iTel >= 0 ? (vals[iTel] || '') : '',
      cargo: iCargo >= 0 ? (vals[iCargo] || '') : '',
      horario: iHorario >= 0 ? (vals[iHorario] || '') : '',
      sabado: iSabado >= 0 ? (vals[iSabado] || '') : '',
    });
  }

  return rows;
}

export default function ModalImportarFuncionarios({ isOpen, onClose, onSuccess }: ModalImportarProps) {
  const [etapa, setEtapa] = useState<'upload' | 'preview' | 'resultado'>('upload');
  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(false);
  const [criados, setCriados] = useState(0);
  const [gpsLivre, setGpsLivre] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetar = () => {
    setEtapa('upload');
    setFuncionarios([]);
    setResultados([]);
    setLoading(false);
    setCriados(0);
    setGpsLivre(false);
  };

  const fechar = () => {
    resetar();
    onClose();
  };

  const baixarModelo = () => {
    const csv = `Nome,Email,Telefone,Cargo,Horario,Sabado
Maria Silva,maria@empresa.com,11999998888,Vendedora,08:00-12:00/13:00-17:00,08:00-12:00
João Santos,joao@empresa.com,11988887777,Motorista,06:00-12:00/13:00-15:00,
Ana Costa,ana@empresa.com,,Recepção,08:00-12:00/13:00-17:00,06:00-10:00
Pedro Alves,pedro@empresa.com,11977776666,Operador,06:00-14:00,`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_funcionarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      toast.error('Envie um arquivo CSV. Baixe o modelo para ver o formato.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('Nenhum funcionário encontrado. Verifique se o CSV está no formato correto.');
        return;
      }

      setFuncionarios(rows);

      // Validar no servidor
      setLoading(true);
      try {
        const res = await axios.post('/api/admin/funcionarios/importar', {
          funcionarios: rows,
          apenasValidar: true,
        });
        setResultados(res.data.resultados);
        setEtapa('preview');
      } catch (err: any) {
        toast.error(err.response?.data?.erro || 'Erro ao validar.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const confirmarImportacao = async () => {
    const validos = funcionarios.filter((_, i) => resultados[i]?.valido);
    if (validos.length === 0) {
      toast.error('Nenhum funcionário válido para importar.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/funcionarios/importar', {
        funcionarios,
        apenasValidar: false,
        gpsLivre,
      });

      setCriados(res.data.criados);
      setResultados(res.data.resultados);
      setEtapa('resultado');

      if (res.data.criados > 0) {
        toast.success(`${res.data.criados} funcionário(s) importado(s)!`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro na importação.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const validos = resultados.filter(r => r.valido).length;
  const invalidos = resultados.filter(r => !r.valido).length;

  return (
    <div className="fixed inset-0 z-[60] md:flex md:items-center md:justify-center bg-page md:bg-overlay md:backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      <div className="bg-page md:bg-surface-solid w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl md:border md:border-border-default shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border-subtle flex justify-between items-center bg-surface-solid/80 backdrop-blur-sm md:rounded-t-2xl sticky top-0 z-10 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
          <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-3">
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <FileSpreadsheet size={18} className="text-emerald-400" />
            </div>
            Importar Funcionários
          </h2>
          <button
            onClick={fechar}
            className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl text-text-muted hover:text-text-primary transition-colors border border-border-subtle active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4">

          {/* ETAPA 1: Upload */}
          {etapa === 'upload' && (
            <div className="space-y-4">
              <div className="bg-surface p-5 rounded-2xl border border-border-subtle space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                    <Download size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">1. Baixe o modelo</p>
                    <p className="text-xs text-text-muted mt-1">
                      Planilha CSV com as colunas: Nome, Email, Telefone, Cargo e Horário.
                    </p>
                  </div>
                </div>
                <button
                  onClick={baixarModelo}
                  className="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all active:scale-95"
                >
                  <Download size={16} /> Baixar Modelo CSV
                </button>
              </div>

              <div className="bg-surface p-5 rounded-2xl border border-border-subtle space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-500/10 p-2.5 rounded-xl">
                    <Upload size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">2. Envie a planilha preenchida</p>
                    <p className="text-xs text-text-muted mt-1">
                      O sistema vai validar tudo antes de criar os cadastros.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-hover-bg transition-colors"
                >
                  {loading ? (
                    <RefreshCw size={24} className="text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <Upload size={24} className="text-text-faint" />
                      <p className="text-sm text-text-muted font-medium">Clique para enviar o CSV</p>
                      <p className="text-[10px] text-text-faint">Formato: .csv (separado por vírgula ou ponto-e-vírgula)</p>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-300">Dicas:</p>
                <ul className="text-[11px] text-blue-200/80 space-y-1 list-disc list-inside">
                  <li>Horário no formato: <strong>08:00-12:00/13:00-17:00</strong> (manhã/tarde)</li>
                  <li>Jornada contínua: <strong>06:00-14:00</strong> (sem intervalo)</li>
                  <li>Sábado: <strong>08:00-12:00</strong> (deixe vazio se não trabalha sábado)</li>
                  <li>Se deixar o horário vazio, usa o padrão 08:00-17:00</li>
                  <li>Telefone e cargo são opcionais</li>
                  <li>Todos recebem senha inicial <strong>1234</strong> + email de boas-vindas</li>
                </ul>
              </div>
            </div>
          )}

          {/* ETAPA 2: Prévia */}
          {etapa === 'preview' && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface p-4 rounded-xl border border-border-subtle text-center">
                  <p className="text-2xl font-bold text-text-primary">{resultados.length}</p>
                  <p className="text-[10px] text-text-faint uppercase font-bold">Total</p>
                </div>
                <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{validos}</p>
                  <p className="text-[10px] text-emerald-300/70 uppercase font-bold">Válidos</p>
                </div>
                {invalidos > 0 && (
                  <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20 text-center">
                    <p className="text-2xl font-bold text-red-400">{invalidos}</p>
                    <p className="text-[10px] text-red-300/70 uppercase font-bold">Com Erro</p>
                  </div>
                )}
              </div>

              {/* GPS Livre */}
              <div
                onClick={() => setGpsLivre(!gpsLivre)}
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                  gpsLivre
                    ? 'bg-emerald-900/15 border-emerald-500/30'
                    : 'bg-surface border-border-subtle'
                }`}
              >
                <div className={`p-2 rounded-xl ${gpsLivre ? 'bg-emerald-500/15' : 'bg-hover-bg'}`}>
                  <MapPin size={18} className={gpsLivre ? 'text-emerald-400' : 'text-text-faint'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">GPS Livre</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Permite bater ponto de qualquer local, sem validação de GPS.
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${gpsLivre ? 'bg-emerald-500' : 'bg-elevated-solid'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${gpsLivre ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              {/* Tabela */}
              <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-hover-bg">
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">#</th>
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">Nome</th>
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">Email</th>
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">Horário</th>
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">Sábado</th>
                        <th className="text-left p-3 text-text-faint font-bold uppercase text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border-subtle last:border-0 ${!r.valido ? 'bg-red-900/5' : ''}`}
                        >
                          <td className="p-3 text-text-faint">{r.linha}</td>
                          <td className="p-3 text-text-primary font-medium">{r.nome || '-'}</td>
                          <td className="p-3 text-text-secondary">{r.email || '-'}</td>
                          <td className="p-3 text-text-muted font-mono">{funcionarios[i]?.horario || 'Padrão'}</td>
                          <td className="p-3 text-text-muted font-mono">{funcionarios[i]?.sabado || '-'}</td>
                          <td className="p-3">
                            {r.valido ? (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 size={12} /> OK
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400">
                                <AlertTriangle size={12} /> {r.erro}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidos > 0 && (
                <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-200">
                    {invalidos} registro(s) com erro serão ignorados. Apenas os {validos} válidos serão importados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: Resultado */}
          {etapa === 'resultado' && (
            <div className="space-y-4">
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Users size={32} className="text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-400">{criados} funcionário(s) importado(s)!</p>
                <p className="text-xs text-text-muted">
                  Todos receberam email de boas-vindas com senha <strong>1234</strong>.
                </p>
              </div>

              {/* Pendências */}
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <p className="text-sm font-bold text-amber-400">Configurações pendentes</p>
                </div>
                <p className="text-xs text-amber-200/80">
                  Os funcionários foram criados com as informações da planilha, mas alguns itens precisam ser configurados individualmente. Edite cada funcionário para completar:
                </p>
                <ul className="text-xs text-amber-200/70 space-y-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>Localização GPS</strong> — definir a sede/local de trabalho no mapa</span>
                  </li>
                  
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>Sábados do mês</strong> — marcar quais sábados trabalha (1º, 2º, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>Modo de validação</strong> — trocar para IP fixo se necessário</span>
                  </li>
                </ul>
              </div>

              {invalidos > 0 && (
                <div className="bg-surface rounded-2xl border border-border-subtle p-4 space-y-2">
                  <p className="text-xs font-bold text-text-faint uppercase">Registros ignorados:</p>
                  {resultados.filter(r => !r.valido).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-300">
                      <AlertTriangle size={12} />
                      <span>Linha {r.linha}: {r.nome || '(sem nome)'} — {r.erro}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-border-subtle bg-surface-solid/80 backdrop-blur-sm md:rounded-b-2xl sticky bottom-0 z-10 flex-shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          {etapa === 'upload' && (
            <button
              onClick={fechar}
              className="w-full py-3.5 bg-hover-bg text-text-secondary rounded-2xl font-bold text-sm hover:bg-hover-bg-strong transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}

          {etapa === 'preview' && (
            <div className="flex gap-3">
              <button
                onClick={resetar}
                className="flex-1 py-3.5 bg-hover-bg text-text-secondary rounded-2xl font-bold text-sm hover:bg-hover-bg-strong transition-all active:scale-95"
              >
                Voltar
              </button>
              <button
                onClick={confirmarImportacao}
                disabled={loading || validos === 0}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={18} /> Importar {validos} funcionário(s)
                  </>
                )}
              </button>
            </div>
          )}

          {etapa === 'resultado' && (
            <button
              onClick={fechar}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm transition-all active:scale-95"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

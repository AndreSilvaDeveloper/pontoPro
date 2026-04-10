'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  Search,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
}

interface ContrachequeItem {
  id: string;
  mes: string;
  arquivoUrl: string;
  nomeArquivo: string;
  criadoEm: string;
  visualizado: boolean;
  visualizadoEm: string | null;
  assinado: boolean;
  assinadoEm: string | null;
  assinaturaUrl: string | null;
  enviadoPorNome: string;
  usuario: { id: string; nome: string; email: string };
}

const MESES_PT: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

function formatMes(mes: string) {
  const [ano, m] = mes.split('-');
  return `${MESES_PT[m] || m} ${ano}`;
}

export default function ContrachequeAdmin() {
  const [contracheques, setContracheques] = useState<ContrachequeItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');

  // Upload form state
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [buscaFunc, setBuscaFunc] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<Map<string, File>>(new Map());
  const [bulkMes, setBulkMes] = useState('');
  const [enviandoBulk, setEnviandoBulk] = useState(false);
  const [bulkProgresso, setBulkProgresso] = useState({ atual: 0, total: 0 });

  // Delete confirmation
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [assinaturaModal, setAssinaturaModal] = useState<ContrachequeItem | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const params = filtroMes ? `?mes=${filtroMes}` : '';
      const { data } = await axios.get(`/api/admin/contracheques${params}`);
      setContracheques(data.contracheques);
      setFuncionarios(data.funcionarios);
    } catch {
      toast.error('Erro ao carregar contracheques');
    } finally {
      setLoading(false);
    }
  }, [filtroMes]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Set default month to current
  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setMesSelecionado(m);
    setBulkMes(m);
  }, []);

  const funcionariosFiltrados = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(buscaFunc.toLowerCase()) ||
      f.email.toLowerCase().includes(buscaFunc.toLowerCase())
  );

  const enviarContracheque = async () => {
    if (!arquivo || !usuarioSelecionado || !mesSelecionado) {
      toast.error('Preencha todos os campos');
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('usuarioId', usuarioSelecionado);
      formData.append('mes', mesSelecionado);

      await axios.post('/api/admin/contracheques', formData);
      toast.success('Contracheque enviado com sucesso');
      setArquivo(null);
      setUsuarioSelecionado('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      carregarDados();
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar contracheque');
    } finally {
      setEnviando(false);
    }
  };

  const enviarBulk = async () => {
    if (bulkFiles.size === 0 || !bulkMes) {
      toast.error('Selecione o mês e os arquivos');
      return;
    }
    setEnviandoBulk(true);
    setBulkProgresso({ atual: 0, total: bulkFiles.size });

    let sucesso = 0;
    let erros = 0;
    const entries = Array.from(bulkFiles.entries());

    for (let i = 0; i < entries.length; i++) {
      const [usuarioId, file] = entries[i];
      setBulkProgresso({ atual: i + 1, total: entries.length });
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('usuarioId', usuarioId);
        formData.append('mes', bulkMes);
        await axios.post('/api/admin/contracheques', formData);
        sucesso++;
      } catch {
        erros++;
      }
    }

    if (erros === 0) {
      toast.success(`${sucesso} contracheque(s) enviado(s) com sucesso`);
    } else {
      toast.warning(`${sucesso} enviado(s), ${erros} erro(s)`);
    }

    setBulkFiles(new Map());
    setBulkProgresso({ atual: 0, total: 0 });
    setEnviandoBulk(false);
    carregarDados();
  };

  const excluir = async (id: string) => {
    try {
      await axios.delete(`/api/admin/contracheques?id=${id}`);
      toast.success('Contracheque excluído');
      setDeletandoId(null);
      carregarDados();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  // Group contracheques by month
  const agrupadosPorMes = contracheques.reduce<Record<string, ContrachequeItem[]>>((acc, c) => {
    if (!acc[c.mes]) acc[c.mes] = [];
    acc[c.mes].push(c);
    return acc;
  }, {});

  const mesesOrdenados = Object.keys(agrupadosPorMes).sort((a, b) => b.localeCompare(a));

  // Generate month options for filter
  const mesesDisponiveis = [...new Set(contracheques.map((c) => c.mes))].sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10 space-y-6">
          <div className="h-8 w-48 bg-hover-bg rounded-lg animate-pulse" />
          <div className="h-48 bg-hover-bg rounded-2xl animate-pulse" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-hover-bg rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans selection:bg-purple-500/30 relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 hover:bg-hover-bg rounded-xl text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
            <FileText size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Contracheques</h1>
            <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Gestao de Holerites</p>
          </div>
        </div>

        {/* Toggle: Single / Bulk */}
        <div className="flex gap-2">
          <button
            onClick={() => setBulkMode(false)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              !bulkMode
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-elevated text-text-muted hover:bg-elevated-solid border border-border-subtle'
            }`}
          >
            Envio Individual
          </button>
          <button
            onClick={() => setBulkMode(true)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              bulkMode
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-elevated text-text-muted hover:bg-elevated-solid border border-border-subtle'
            }`}
          >
            Envio em Massa
          </button>
        </div>

        {/* Upload Form - Individual */}
        {!bulkMode && (
          <div className="bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Enviar Contracheque</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Employee selector */}
              <div ref={dropdownRef} className="relative">
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1 block mb-1.5">
                  Funcionario
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownAberto((v) => !v)}
                  className="w-full bg-page border border-border-input hover:border-purple-500/50 rounded-xl py-3 px-3 text-sm text-text-secondary outline-none focus:border-purple-500 transition-all text-left flex items-center justify-between"
                >
                  <span className="truncate">
                    {usuarioSelecionado
                      ? funcionarios.find((f) => f.id === usuarioSelecionado)?.nome || 'Selecione'
                      : 'Selecione o funcionario'}
                  </span>
                  <ChevronDown size={16} className="text-text-faint shrink-0" />
                </button>

                {dropdownAberto && (
                  <div className="absolute z-50 mt-2 w-full bg-page border border-border-default rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-border-subtle">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-text-faint" />
                        <input
                          autoFocus
                          value={buscaFunc}
                          onChange={(e) => setBuscaFunc(e.target.value)}
                          placeholder="Buscar..."
                          className="w-full bg-page border border-border-input rounded-xl pl-8 pr-3 py-2 text-sm text-text-secondary outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {funcionariosFiltrados.length > 0 ? (
                        funcionariosFiltrados.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setUsuarioSelecionado(f.id);
                              setBuscaFunc('');
                              setDropdownAberto(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors ${
                              usuarioSelecionado === f.id ? 'text-purple-300' : 'text-text-secondary'
                            }`}
                          >
                            <div className="font-semibold truncate">{f.nome}</div>
                            <div className="text-[10px] text-text-faint truncate">{f.email}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-xs text-text-faint">Nenhum encontrado</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Month selector */}
              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1 block mb-1.5">
                  Mes de referencia
                </label>
                <input
                  type="month"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="w-full bg-page border border-border-input hover:border-purple-500/50 rounded-xl py-3 px-3 text-sm text-text-secondary outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1 block mb-1.5">
                  Arquivo PDF
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className="w-full bg-page border border-border-input rounded-xl py-2.5 px-3 text-sm text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 transition-all"
                />
              </div>
            </div>

            <button
              onClick={enviarContracheque}
              disabled={enviando || !arquivo || !usuarioSelecionado || !mesSelecionado}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {enviando ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Upload size={18} /> Enviar Contracheque
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Form - Bulk */}
        {bulkMode && (
          <div className="bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Envio em Massa</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1 block mb-1.5">
                  Mes de referencia
                </label>
                <input
                  type="month"
                  value={bulkMes}
                  onChange={(e) => setBulkMes(e.target.value)}
                  className="w-full bg-page border border-border-input hover:border-purple-500/50 rounded-xl py-3 px-3 text-sm text-text-secondary outline-none focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Selecione um arquivo PDF para cada funcionario. O sistema enviara todos de uma vez.
            </p>

            <div className="space-y-2 max-h-80 overflow-auto">
              {funcionarios.map((f) => {
                const file = bulkFiles.get(f.id);
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      file
                        ? 'bg-purple-500/5 border-purple-500/20'
                        : 'bg-elevated border-border-subtle'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{f.nome}</p>
                      <p className="text-[10px] text-text-faint truncate">{f.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file && (
                        <span className="text-[10px] text-purple-400 truncate max-w-[100px]">{file.name}</span>
                      )}
                      <label className="cursor-pointer px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold border border-purple-500/20 transition-colors">
                        {file ? 'Trocar' : 'PDF'}
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const selected = e.target.files?.[0];
                            if (selected) {
                              setBulkFiles((prev) => {
                                const next = new Map(prev);
                                next.set(f.id, selected);
                                return next;
                              });
                            }
                          }}
                        />
                      </label>
                      {file && (
                        <button
                          onClick={() => {
                            setBulkFiles((prev) => {
                              const next = new Map(prev);
                              next.delete(f.id);
                              return next;
                            });
                          }}
                          className="p-1 text-text-faint hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {bulkFiles.size > 0 && (
              <button
                onClick={enviarBulk}
                disabled={enviandoBulk || !bulkMes}
                className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {enviandoBulk ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Enviando {bulkProgresso.atual}/{bulkProgresso.total}...
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Enviar {bulkFiles.size} Contracheque(s)
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-text-faint" />
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="bg-page border border-border-input hover:border-purple-500/50 rounded-xl py-2 px-3 text-sm text-text-secondary outline-none focus:border-purple-500 transition-all"
          >
            <option value="">Todos os meses</option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {formatMes(m)}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-faint">{contracheques.length} contracheque(s)</span>
        </div>

        {/* List grouped by month */}
        {mesesOrdenados.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-text-faint mb-4 opacity-40" />
            <p className="text-text-muted text-sm">Nenhum contracheque enviado ainda</p>
          </div>
        ) : (
          mesesOrdenados.map((mes) => (
            <div key={mes} className="space-y-2">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {formatMes(mes)}
                <span className="text-[10px] text-text-faint font-normal ml-1">
                  ({agrupadosPorMes[mes].length} enviado{agrupadosPorMes[mes].length > 1 ? 's' : ''})
                </span>
              </h3>

              {agrupadosPorMes[mes].map((c) => (
                <div
                  key={c.id}
                  className="bg-elevated hover:bg-elevated-solid border border-border-subtle rounded-2xl p-4 flex items-center gap-4 transition-all group"
                >
                  <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 shrink-0">
                    <FileText size={20} className="text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{c.usuario.nome}</p>
                    <p className="text-[10px] text-text-faint truncate">
                      {c.nomeArquivo} - Enviado por {c.enviadoPorNome} em{' '}
                      {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.assinado ? (
                      <button
                        onClick={() => setAssinaturaModal(c)}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
                        title="Ver assinatura"
                      >
                        <CheckCircle2 size={12} /> Assinado
                      </button>
                    ) : c.visualizado ? (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold">
                        <Eye size={12} /> Visto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-text-faint font-bold">
                        <EyeOff size={12} /> Pendente
                      </span>
                    )}

                    <a
                      href={c.arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-purple-500/20 rounded-lg text-purple-400 transition-colors"
                      title="Abrir PDF"
                    >
                      <FileText size={16} />
                    </a>

                    {deletandoId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => excluir(c.id)}
                          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletandoId(null)}
                          className="p-1 text-text-faint hover:text-text-secondary transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletandoId(c.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-text-faint hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Modal Assinatura */}
      {assinaturaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-solid border border-border-default w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <h3 className="text-base font-bold text-text-primary">Comprovante de Assinatura</h3>
              <button onClick={() => setAssinaturaModal(null)} className="text-text-faint hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-text-faint font-bold uppercase">Funcionário</p>
                <p className="text-sm font-bold text-text-primary">{assinaturaModal.usuario.nome}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-text-faint font-bold uppercase">Contracheque</p>
                <p className="text-sm text-text-secondary">{formatMes(assinaturaModal.mes)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-text-faint font-bold uppercase">Assinado em</p>
                <p className="text-sm text-emerald-400 font-bold">
                  {assinaturaModal.assinadoEm ? new Date(assinaturaModal.assinadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}
                </p>
              </div>
              {assinaturaModal.assinaturaUrl && (
                <div className="space-y-1">
                  <p className="text-[10px] text-text-faint font-bold uppercase">Assinatura Digital</p>
                  <div className="bg-white rounded-xl p-4 border border-border-subtle">
                    <img
                      src={assinaturaModal.assinaturaUrl}
                      alt={`Assinatura de ${assinaturaModal.usuario.nome}`}
                      className="w-full h-auto max-h-32 object-contain"
                    />
                  </div>
                </div>
              )}
              <a
                href={`/api/admin/contracheques/assinado?id=${assinaturaModal.id}`}
                download
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <FileText size={16} /> Baixar PDF com assinatura
              </a>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-400 font-bold">
                  <CheckCircle2 size={14} className="inline mr-1" />
                  Recebimento confirmado pelo funcionário
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

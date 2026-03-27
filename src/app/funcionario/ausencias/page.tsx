'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Upload,
  FileText,
  Calendar,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  Stethoscope,
  Palmtree,
  ShieldAlert,
  FileCheck,
  Image,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AvisoType = { tipo: 'sucesso' | 'erro'; texto: string } | null;

const TIPO_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  ATESTADO: { label: 'Atestado Médico', cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Stethoscope },
  FALTA_JUSTIFICADA: { label: 'Atestado Médico', cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Stethoscope },
  FOLGA: { label: 'Folga / Abono', cor: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: FileCheck },
  FERIAS: { label: 'Férias', cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Palmtree },
};

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock },
  APROVADO: { label: 'Aprovado', cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  REJEITADO: { label: 'Rejeitado', cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
};

const getTipoCfg = (tipo: string) => TIPO_CONFIG[tipo] || TIPO_CONFIG.ATESTADO;

/** Verifica se a ausência é parcial (horas diferentes de 12:00) */
function isParcial(item: any): boolean {
  const h1 = new Date(item.dataInicio).getHours();
  const h2 = new Date(item.dataFim).getHours();
  const sameDay = format(new Date(item.dataInicio), 'yyyy-MM-dd') === format(new Date(item.dataFim), 'yyyy-MM-dd');
  return sameDay && (h1 !== 12 || h2 !== 12) && h1 !== h2;
}

export default function MinhasAusencias() {
  const [ausencias, setAusencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [tipo, setTipo] = useState('ATESTADO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [parcial, setParcial] = useState(false);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [aviso, setAviso] = useState<AvisoType>(null);

  // Exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => { carregarAusencias(); }, []);

  const carregarAusencias = async () => {
    setCarregando(true);
    try {
      const res = await axios.get('/api/funcionario/solicitar-ausencia');
      setAusencias(res.data);
    } catch {
      console.error('Erro ao carregar ausências');
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalNovo = () => {
    setIdEdicao(null);
    setTipo('ATESTADO');
    setDataInicio('');
    setDataFim('');
    setMotivo('');
    setArquivo(null);
    setParcial(false);
    setHoraInicio('');
    setHoraFim('');
    setAviso(null);
    setModalAberto(true);
  };

  const abrirModalEdicao = (item: any) => {
    setIdEdicao(item.id);
    setTipo(item.tipo);
    setDataInicio(format(new Date(item.dataInicio), 'yyyy-MM-dd'));
    setMotivo(item.motivo);
    setArquivo(null);
    setAviso(null);

    if (isParcial(item)) {
      setParcial(true);
      setHoraInicio(format(new Date(item.dataInicio), 'HH:mm'));
      setHoraFim(format(new Date(item.dataFim), 'HH:mm'));
      setDataFim('');
    } else {
      setParcial(false);
      setHoraInicio('');
      setHoraFim('');
      setDataFim(format(new Date(item.dataFim), 'yyyy-MM-dd'));
    }

    setModalAberto(true);
  };

  const salvarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);

    if (!dataInicio || !motivo) {
      setAviso({ tipo: 'erro', texto: 'Preencha a data e o motivo.' });
      return;
    }

    if (parcial && (!horaInicio || !horaFim)) {
      setAviso({ tipo: 'erro', texto: 'Informe o horário de início e fim.' });
      return;
    }

    if (parcial && horaInicio >= horaFim) {
      setAviso({ tipo: 'erro', texto: 'O horário final deve ser após o inicial.' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dataInicio', dataInicio);
      formData.append('tipo', tipo);
      formData.append('motivo', motivo);

      if (parcial) {
        formData.append('horaInicio', horaInicio);
        formData.append('horaFim', horaFim);
        formData.append('dataFim', dataInicio); // mesmo dia
      } else {
        formData.append('dataFim', dataFim || dataInicio);
      }

      if (arquivo) formData.append('comprovante', arquivo);

      if (idEdicao) {
        formData.append('id', idEdicao);
        await axios.put('/api/funcionario/solicitar-ausencia', formData);
        setAviso({ tipo: 'sucesso', texto: 'Solicitação atualizada!' });
      } else {
        await axios.post('/api/funcionario/solicitar-ausencia', formData);
        setAviso({ tipo: 'sucesso', texto: 'Solicitação enviada!' });
      }

      setTimeout(() => { setModalAberto(false); setAviso(null); }, 800);
      carregarAusencias();
    } catch (error: any) {
      setAviso({ tipo: 'erro', texto: error.response?.data?.erro || 'Erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  const excluirSolicitacao = async (id: string) => {
    try {
      await axios.delete(`/api/funcionario/solicitar-ausencia?id=${id}`);
      setExcluindoId(null);
      carregarAusencias();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao excluir');
    }
  };

  // Contadores
  const pendentes = ausencias.filter(a => a.status === 'PENDENTE').length;
  const aprovados = ausencias.filter(a => a.status === 'APROVADO').length;
  const rejeitados = ausencias.filter(a => a.status === 'REJEITADO').length;

  return (
    <div
      className="min-h-screen bg-page text-text-primary relative overflow-hidden font-sans"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-orb-purple rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orb-indigo rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 pb-24 relative z-10">

        {/* === HEADER === */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <FileText className="text-purple-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">Minhas Ausências</h1>
              <p className="text-[11px] text-text-faint font-medium">Atestados, justificativas e férias</p>
            </div>
          </div>
        </div>

        {/* === RESUMO === */}
        {!carregando && ausencias.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{pendentes}</p>
              <p className="text-[10px] text-amber-400/70 font-bold uppercase tracking-wider">Pendentes</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{aprovados}</p>
              <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider">Aprovados</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-red-400">{rejeitados}</p>
              <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-wider">Rejeitados</p>
            </div>
          </div>
        )}

        {/* === BOTÃO NOVA === */}
        <button
          onClick={abrirModalNovo}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95 mb-5"
        >
          <PlusCircle size={20} /> Nova Justificativa / Atestado
        </button>

        {/* === LISTA === */}
        <div className="space-y-3">
          {carregando ? (
            <div className="text-center py-16">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-text-faint text-sm">Carregando...</p>
            </div>
          ) : ausencias.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-elevated/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-text-dim" />
              </div>
              <p className="text-text-faint text-sm font-medium">Nenhuma solicitação</p>
              <p className="text-text-dim text-xs mt-1">Clique no botão acima para criar uma justificativa</p>
            </div>
          ) : (
            ausencias.map((item) => {
              const tipoCfg = getTipoCfg(item.tipo);
              const stCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDENTE;
              const StIcon = stCfg.icon;
              const TipoIcon = tipoCfg.icon;
              const parcialItem = isParcial(item);
              const mesmaData = format(new Date(item.dataInicio), 'yyyy-MM-dd') === format(new Date(item.dataFim), 'yyyy-MM-dd');

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${stCfg.bg} ${stCfg.border}`}
                >
                  <div className="p-4">
                    {/* Topo: tipo + status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${tipoCfg.bg} border ${tipoCfg.border}`}>
                          <TipoIcon size={18} className={tipoCfg.cor} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{tipoCfg.label}</p>
                          <span className="text-[10px] text-text-faint">
                            {format(new Date(item.criadoEm), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${stCfg.bg} ${stCfg.cor} border ${stCfg.border}`}>
                        <StIcon size={12} /> {stCfg.label}
                      </div>
                    </div>

                    {/* Data/período */}
                    <div className="bg-input-solid/30 rounded-xl p-3 border border-border-subtle mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-text-faint" />
                        {parcialItem ? (
                          <span className="text-text-primary">
                            {format(new Date(item.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
                            <span className="text-text-muted ml-2">
                              {format(new Date(item.dataInicio), 'HH:mm')} — {format(new Date(item.dataFim), 'HH:mm')}
                            </span>
                            <span className="ml-2 text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">PARCIAL</span>
                          </span>
                        ) : mesmaData ? (
                          <span className="text-text-primary">
                            {format(new Date(item.dataInicio), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-text-primary">
                            {format(new Date(item.dataInicio), 'dd/MM/yyyy')} — {format(new Date(item.dataFim), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <p className="text-xs text-text-muted leading-relaxed">
                      <span className="text-text-dim font-medium">Motivo: </span>
                      {item.motivo}
                    </p>

                    {/* Comprovante */}
                    {item.comprovanteUrl && (
                      <a
                        href={item.comprovanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        <Image size={12} /> Ver comprovante <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {/* Ações (só se pendente) */}
                  {item.status === 'PENDENTE' && (
                    <div className="px-4 pb-4 pt-1">
                      {excluindoId === item.id ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-in fade-in duration-200">
                          <ShieldAlert size={18} className="text-red-400 shrink-0" />
                          <p className="text-xs text-red-300 flex-1">Cancelar esta solicitação?</p>
                          <button
                            onClick={() => excluirSolicitacao(item.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold active:scale-95 transition-all"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setExcluindoId(null)}
                            className="px-3 py-1.5 bg-border-input text-text-secondary rounded-lg text-xs font-bold active:scale-95 transition-all"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirModalEdicao(item)}
                            className="flex-1 flex items-center justify-center gap-2 bg-elevated/60 hover:bg-purple-500/10 text-text-secondary hover:text-purple-400 py-2.5 rounded-xl text-xs font-bold border border-border-subtle hover:border-purple-500/20 transition-all active:scale-95"
                          >
                            <Pencil size={14} /> Editar
                          </button>
                          <button
                            onClick={() => setExcluindoId(item.id)}
                            className="flex items-center justify-center gap-2 px-4 bg-elevated/60 hover:bg-red-500/10 text-text-faint hover:text-red-400 py-2.5 rounded-xl text-xs font-bold border border-border-subtle hover:border-red-500/20 transition-all active:scale-95"
                          >
                            <Trash2 size={14} /> Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* === MODAL === */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setModalAberto(false)} />

            <div className="relative z-10 w-full max-w-sm bg-page border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
              {/* Header */}
              <div className="bg-page border-b border-border-subtle px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FileText size={18} className="text-purple-400" />
                  {idEdicao ? 'Editar Solicitação' : 'Nova Justificativa'}
                </h3>
                <button onClick={() => setModalAberto(false)} className="p-1.5 text-text-faint hover:text-text-primary rounded-lg hover:bg-hover-bg transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={salvarSolicitacao}>
                <div className="px-6 py-5 space-y-4 max-h-[65dvh] overflow-y-auto">
                  {/* Aviso */}
                  {aviso && (
                    <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2.5 ${
                      aviso.tipo === 'erro'
                        ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {aviso.tipo === 'erro' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                      <span className="text-xs">{aviso.texto}</span>
                    </div>
                  )}

                  {/* Tipo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Tipo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
                        const Icon = cfg.icon;
                        const selected = tipo === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setTipo(key)}
                            className={`p-3 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center gap-1.5 ${
                              selected
                                ? `${cfg.bg} ${cfg.border} ${cfg.cor}`
                                : 'bg-surface border-border-subtle text-text-faint hover:border-border-default'
                            }`}
                          >
                            <Icon size={18} />
                            <span className="text-[10px] font-bold leading-tight">
                              {key === 'FALTA_JUSTIFICADA' ? 'Falta' : cfg.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggle parcial */}
                  <div className="flex items-center justify-between bg-surface border border-border-subtle rounded-xl p-3">
                    <div>
                      <p className="text-sm text-text-primary font-medium">Ausência parcial</p>
                      <p className="text-[10px] text-text-faint">Apenas algumas horas do dia</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setParcial(!parcial); setHoraInicio(''); setHoraFim(''); setDataFim(''); }}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        parcial ? 'bg-purple-600' : 'bg-border-input'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${
                        parcial ? 'left-[1.375rem]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Datas */}
                  {parcial ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Data</label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={e => setDataInicio(e.target.value)}
                          className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm text-center outline-none focus:border-purple-500 transition-colors"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Hora Início</label>
                          <input
                            type="time"
                            value={horaInicio}
                            onChange={e => setHoraInicio(e.target.value)}
                            className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-lg font-bold text-center outline-none focus:border-purple-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Hora Fim</label>
                          <input
                            type="time"
                            value={horaFim}
                            onChange={e => setHoraFim(e.target.value)}
                            className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-lg font-bold text-center outline-none focus:border-purple-500 transition-colors"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Data Início</label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={e => setDataInicio(e.target.value)}
                          className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm text-center outline-none focus:border-purple-500 transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Data Fim</label>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={e => setDataFim(e.target.value)}
                          className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm text-center outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Motivo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Motivo / CID</label>
                    <textarea
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      placeholder="Ex: Consulta médica, CID J06..."
                      className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm h-20 resize-none outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Comprovante (Opcional)</label>
                    <label className="flex items-center gap-3 bg-input-solid/60 border border-dashed border-border-default hover:border-purple-500/30 p-4 rounded-xl cursor-pointer transition-colors group">
                      <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                        <Upload size={18} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary font-medium truncate">
                          {arquivo ? arquivo.name : 'Selecionar arquivo'}
                        </p>
                        <p className="text-[10px] text-text-faint">Imagem ou PDF</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => setArquivo(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="py-4 rounded-xl font-bold text-sm bg-elevated-solid hover:bg-elevated-solid text-text-secondary border border-border-input transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-4 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      idEdicao ? 'Atualizar' : 'Enviar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

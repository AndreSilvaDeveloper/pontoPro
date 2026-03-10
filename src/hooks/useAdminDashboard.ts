'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { calcularEstatisticas } from '@/lib/admin/calcularEstatisticas';
import type { BillingStatus } from '@/lib/billing';
import type { RegistroUnificado } from '@/types/registro';

/** Som de notificação sutil via Web Audio API (duplo "ding" elegante) */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope suave: fade-in rápido + fade-out longo
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1.0, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Primeiro toque (C6 = 1047 Hz)
    playTone(1047, now, 0.25);
    // Segundo toque mais agudo (E6 = 1319 Hz), leve delay
    playTone(1319, now + 0.15, 0.3);

    // Fechar contexto depois do som terminar
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    // Fallback silencioso se Web Audio não estiver disponível
  }
}

const PARCIAL_MARK = '__PARCIAL__:';

export const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

function isValidTimeHHMM(v: any) {
  if (typeof v !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function parseParcialFromNome(nome: string): { horaInicio?: string; horaFim?: string } {
  if (!nome) return {};
  const idx = nome.indexOf(PARCIAL_MARK);
  if (idx === -1) return {};
  const rest = nome.slice(idx + PARCIAL_MARK.length).trim(); // "08:00-12:00"
  const [h1, h2] = rest.split('-').map((s) => (s || '').trim());
  if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) return { horaInicio: h1, horaFim: h2 };
  return {};
}

export function useAdminDashboard() {
  const [registros, setRegistros] = useState<RegistroUnificado[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [feriadosParciais, setFeriadosParciais] = useState<Record<string, { inicio: string; fim: string }>>({});
  const [empresa, setEmpresa] = useState<any>({
    nome: 'Carregando...',
    cnpj: '',
    configuracoes: { ocultar_menu_atestados: false },
  });
  const [loading, setLoading] = useState(true);

  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0);
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0);

  // ✅ NOVO: Billing status central
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingEmpresa, setBillingEmpresa] = useState<any>(null);

  const somTocadoRef = useRef(false);

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [buscaFuncionario, setBuscaFuncionario] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [modalAusenciaAberto, setModalAusenciaAberto] = useState(false);
  const [modalJornadaAberto, setModalJornadaAberto] = useState(false);

  const [pontoEmEdicao, setPontoEmEdicao] = useState<any>(null);
  const [novaHora, setNovaHora] = useState('');
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [ausenciaUser, setAusenciaUser] = useState('');
  const [ausenciaTipo, setAusenciaTipo] = useState('FERIAS');
  const [ausenciaInicio, setAusenciaInicio] = useState('');
  const [ausenciaFim, setAusenciaFim] = useState('');
  const [ausenciaMotivo, setAusenciaMotivo] = useState('');
  const [salvandoAusencia, setSalvandoAusencia] = useState(false);

  const [ausenciaHoraInicio, setAusenciaHoraInicio] = useState<string>('');
const [ausenciaHoraFim, setAusenciaHoraFim] = useState<string>('');


  const carregarDados = useCallback(async () => {
    try {
      const [
        resPontos,
        resAusencias,
        resUsers,
        resSolicitacoes,
        resPendencias,
        resFeriados,
        resEmpresa,
        resBilling,
      ] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'),
        axios.get('/api/admin/ausencias'),
        axios.get('/api/admin/feriados'),
        axios.get('/api/admin/empresa'),
        axios.get('/api/empresa/billing-status').catch(() => ({ data: null })),
      ]);

      setUsuarios(resUsers.data);

      // ✅ NOVO: separa feriados integrais vs parciais usando o "nome"
      const feriadosIntegrais: string[] = [];
      const parciaisMap: Record<string, { inicio: string; fim: string }> = {};

      (resFeriados.data || []).forEach((f: any) => {
        const dia = format(new Date(f.data), 'yyyy-MM-dd');
        const parsed = parseParcialFromNome(f.nome || '');
        if (parsed.horaInicio && parsed.horaFim) {
          parciaisMap[dia] = { inicio: parsed.horaInicio, fim: parsed.horaFim };
        } else {
          feriadosIntegrais.push(dia);
        }
      });

      setFeriados(feriadosIntegrais);
      setFeriadosParciais(parciaisMap);

      setEmpresa(resEmpresa.data);
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);

      if (resBilling?.data?.ok) {
        setBilling(resBilling.data.billing || null);
        setBillingEmpresa(resBilling.data.empresa || null);
      } else {
        setBilling(null);
        setBillingEmpresa(null);
      }

      const listaUnificada: RegistroUnificado[] = [];

      resPontos.data.forEach((p: any) => {
        listaUnificada.push({
          id: p.id,
          dataHora: p.dataHora,
          tipo: 'PONTO',
          subTipo: p.tipo,
          descricao: p.endereco,
          usuario: p.usuario,
          extra: { fotoUrl: p.fotoUrl },
        });
      });

      resAusencias.data.forEach((a: any) => {
        listaUnificada.push({
          id: a.id,
          dataHora: a.dataInicio,
          tipo: 'AUSENCIA',
          subTipo: a.tipo,
          descricao: a.motivo,
          usuario: a.usuario,
          extra: { comprovanteUrl: a.comprovanteUrl, dataFim: a.dataFim },
        });
      });

      listaUnificada.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
      setRegistros(listaUnificada);
    } catch (error) {
      console.error('Erro ao carregar', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const total = pendenciasAjuste + pendenciasAusencia;
    if (total > 0) {
      setNotificacaoVisivel(true);
      if (!somTocadoRef.current) {
        somTocadoRef.current = true;
        const somTimer = setTimeout(() => playNotificationSound(), 2000);
        const dismissTimer = setTimeout(() => setNotificacaoVisivel(false), 10000);
        return () => { clearTimeout(somTimer); clearTimeout(dismissTimer); };
      }
      const timer = setTimeout(() => setNotificacaoVisivel(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [pendenciasAjuste, pendenciasAusencia]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setDropdownAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const abrirModalEdicao = useCallback((ponto: any) => {
    setPontoEmEdicao(ponto);
    setNovaHora(format(new Date(ponto.dataHora), 'HH:mm'));
    setMotivoEdicao('');
    setModalEdicaoAberto(true);
  }, []);

  const salvarEdicaoPonto = useCallback(async () => {
    if (!novaHora || !pontoEmEdicao) return;
    setSalvandoEdicao(true);
    try {
      const dataOriginal = format(new Date(pontoEmEdicao.dataHora), 'yyyy-MM-dd');
      const dataHoraFinal = new Date(`${dataOriginal}T${novaHora}:00`);

      await axios.put('/api/admin/ponto/editar', {
        id: pontoEmEdicao.id,
        novoHorario: dataHoraFinal.toISOString(),
        motivo: motivoEdicao,
      });

      alert('Horário corrigido!');
      setModalEdicaoAberto(false);
      carregarDados();
    } catch (error) {
      alert('Erro ao editar.');
    } finally {
      setSalvandoEdicao(false);
    }
  }, [carregarDados, motivoEdicao, novaHora, pontoEmEdicao]);

  const excluirPonto = useCallback(
    async (ponto: any) => {
      const motivo = window.prompt(
        '⚠️ ATENÇÃO: Essa ação não pode ser desfeita.\n\nPara excluir, digite o MOTIVO da exclusão:',
      );
      if (motivo === null) return;
      if (motivo.trim() === '') {
        alert('O motivo é obrigatório para registrar nos logs de auditoria.');
        return;
      }
      try {
        await axios.delete('/api/admin/ponto/excluir', { data: { id: ponto.id, motivo } });
        alert('Registro excluído.');
        carregarDados();
      } catch (error) {
        alert('Erro ao excluir registro.');
      }
    },
    [carregarDados],
  );

  const excluirAusencia = useCallback(
    async (aus: any) => {
      const motivo = window.prompt(
        '⚠️ ATENÇÃO: Essa ação não pode ser desfeita.\n\nPara excluir, digite o MOTIVO da exclusão:',
      );
      if (motivo === null) return;

      if (motivo.trim() === '') {
        alert('O motivo é obrigatório para registrar nos logs de auditoria.');
        return;
      }

      try {
        await axios.delete('/api/admin/ausencias/excluir', { data: { id: aus.id, motivo } });
        alert('Registro excluído.');
        carregarDados();
      } catch (error) {
        alert('Erro ao excluir registro.');
      }
    },
    [carregarDados],
  );

  const abrirModalAusencia = useCallback(() => {
    setAusenciaUser('');
    setAusenciaTipo('FERIAS');
    setAusenciaInicio('');
    setAusenciaFim('');
    setAusenciaMotivo('');
    setModalAusenciaAberto(true);
  }, []);

  const salvarAusenciaAdmin = useCallback(async () => {
    if (!ausenciaUser || !ausenciaInicio) return alert('Preencha funcionário e data de início.');
    setSalvandoAusencia(true);
    try {
      await axios.post('/api/admin/ausencias/criar', {
        usuarioId: ausenciaUser,
        tipo: ausenciaTipo,
        dataInicio: ausenciaInicio,
        dataFim: ausenciaFim || ausenciaInicio,
        motivo: ausenciaMotivo,
      });
      alert('Lançamento realizado!');
      setModalAusenciaAberto(false);
      carregarDados();
    } catch (error) {
      alert('Erro ao lançar.');
    } finally {
      setSalvandoAusencia(false);
    }
  }, [ausenciaFim, ausenciaInicio, ausenciaMotivo, ausenciaTipo, ausenciaUser, carregarDados]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroUsuario && r.usuario.id !== filtroUsuario) return false;
      if (r.tipo === 'PONTO') {
        const diaPonto = format(new Date(r.dataHora), 'yyyy-MM-dd');
        return diaPonto >= dataInicio && diaPonto <= dataFim;
      }
      if (r.tipo === 'AUSENCIA') {
        const iniAus = format(new Date(r.dataHora), 'yyyy-MM-dd');
        const fimAus = r.extra?.dataFim ? format(new Date(r.extra.dataFim), 'yyyy-MM-dd') : iniAus;
        return iniAus <= dataFim && fimAus >= dataInicio;
      }
      return false;
    });
  }, [dataFim, dataInicio, filtroUsuario, registros]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (!buscaFuncionario.trim()) return true;
      const termo = buscaFuncionario.trim().toLowerCase();
      return (u.nome || '').toLowerCase().includes(termo) || (u.email || '').toLowerCase().includes(termo);
    });
  }, [buscaFuncionario, usuarios]);

  const usuarioSelecionado = useMemo(() => {
    return filtroUsuario ? usuarios.find((u) => u.id === filtroUsuario) : null;
  }, [filtroUsuario, usuarios]);

  const stats = useMemo(() => {
    return calcularEstatisticas({
      filtroUsuario,
      registros,
      usuarios,
      feriados,
      feriadosParciais, 
      dataInicio,
      dataFim,
    });
  }, [dataFim, dataInicio, feriados, feriadosParciais, filtroUsuario, registros, usuarios]);

  const configs = empresa.configuracoes || {};

  return {
    registros,
    usuarios,
    feriados,
    feriadosParciais, // ✅ NOVO
    empresa,
    configs,

    loading,

    // ✅ billing central
    billing,
    billingEmpresa,

    notificacaoVisivel,
    setNotificacaoVisivel,
    pendenciasAjuste,
    pendenciasAusencia,

    filtroUsuario,
    setFiltroUsuario,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,

    buscaFuncionario,
    setBuscaFuncionario,
    dropdownAberto,
    setDropdownAberto,
    dropdownRef,
    usuariosFiltrados,
    usuarioSelecionado,

    modalEdicaoAberto,
    setModalEdicaoAberto,
    modalAusenciaAberto,
    setModalAusenciaAberto,
    modalJornadaAberto,
    setModalJornadaAberto,

    pontoEmEdicao,
    novaHora,
    setNovaHora,
    motivoEdicao,
    setMotivoEdicao,
    salvandoEdicao,
    abrirModalEdicao,
    salvarEdicaoPonto,

    ausenciaUser,
    setAusenciaUser,
    ausenciaTipo,
    setAusenciaTipo,
    ausenciaInicio,
    setAusenciaInicio,
    ausenciaFim,
    setAusenciaFim,
    ausenciaMotivo,
    setAusenciaMotivo,
    salvandoAusencia,

     ausenciaHoraInicio,
    setAusenciaHoraInicio,
    ausenciaHoraFim,
    setAusenciaHoraFim,
    abrirModalAusencia,
    salvarAusenciaAdmin,

    carregarDados,
    registrosFiltrados,
    excluirPonto,
    excluirAusencia,
    stats,
  };
}

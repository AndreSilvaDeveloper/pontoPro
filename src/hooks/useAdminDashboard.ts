'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { differenceInDays, format, isSameMonth, isSameYear } from 'date-fns';
import { calcularEstatisticas } from '@/lib/admin/calcularEstatisticas';

const SOM_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export function useAdminDashboard() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState<any>({
    nome: 'Carregando...',
    cnpj: '',
    configuracoes: { ocultar_menu_atestados: false },
  });
  const [loading, setLoading] = useState(true);

  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0);
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0);

  const [alertaFinanceiro, setAlertaFinanceiro] = useState<{
    tipo: 'BLOQUEIO' | 'VENCIDO' | 'PROXIMO';
    dias: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      ] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'),
        axios.get('/api/admin/ausencias'),
        axios.get('/api/admin/feriados'),
        axios.get('/api/admin/empresa'),
      ]);

      setUsuarios(resUsers.data);
      setFeriados(resFeriados.data.map((f: any) => format(new Date(f.data), 'yyyy-MM-dd')));
      setEmpresa(resEmpresa.data);
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);

      const dadosEmpresa = resEmpresa.data;

      if (!dadosEmpresa.matrizId) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const ultimoPag = dadosEmpresa.dataUltimoPagamento ? new Date(dadosEmpresa.dataUltimoPagamento) : null;
        const isPago = ultimoPag && isSameMonth(ultimoPag, hoje) && isSameYear(ultimoPag, hoje);

        if (!isPago) {
          const diaVenc = dadosEmpresa.diaVencimento ? parseInt(dadosEmpresa.diaVencimento) : 15;
          let dataVencimento = new Date();
          dataVencimento.setDate(diaVenc);
          dataVencimento.setHours(0, 0, 0, 0);

          const diffDias = differenceInDays(dataVencimento, hoje);

          if (diffDias <= -10) {
            setAlertaFinanceiro({ tipo: 'BLOQUEIO', dias: Math.abs(diffDias) });
          } else if (diffDias < 0) {
            setAlertaFinanceiro({ tipo: 'VENCIDO', dias: Math.abs(diffDias) });
          } else if (diffDias >= 0 && diffDias <= 5) {
            setAlertaFinanceiro({ tipo: 'PROXIMO', dias: diffDias });
          } else {
            setAlertaFinanceiro(null);
          }
        } else {
          setAlertaFinanceiro(null);
        }
      } else {
        setAlertaFinanceiro(null);
      }

      const listaUnificada: any[] = [];

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
    audioRef.current = new Audio(SOM_URL);
    audioRef.current.volume = 0.6;
  }, [carregarDados]);

  useEffect(() => {
    const total = pendenciasAjuste + pendenciasAusencia;
    if (total > 0) {
      setNotificacaoVisivel(true);
      if (audioRef.current) audioRef.current.play().catch(() => {});
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
      dataInicio,
      dataFim,
    });
  }, [dataFim, dataInicio, feriados, filtroUsuario, registros, usuarios]);

  const configs = empresa.configuracoes || {};

  return {
    // dados base
    registros,
    usuarios,
    feriados,
    empresa,
    configs,

    // loading/alertas
    loading,
    alertaFinanceiro,

    // pendencias/toast
    notificacaoVisivel,
    pendenciasAjuste,
    pendenciasAusencia,

    // filtros
    filtroUsuario,
    setFiltroUsuario,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,

    // combobox
    buscaFuncionario,
    setBuscaFuncionario,
    dropdownAberto,
    setDropdownAberto,
    dropdownRef,
    usuariosFiltrados,
    usuarioSelecionado,

    // modais
    modalEdicaoAberto,
    setModalEdicaoAberto,
    modalAusenciaAberto,
    setModalAusenciaAberto,
    modalJornadaAberto,
    setModalJornadaAberto,

    // edição ponto
    pontoEmEdicao,
    novaHora,
    setNovaHora,
    motivoEdicao,
    setMotivoEdicao,
    salvandoEdicao,
    abrirModalEdicao,
    salvarEdicaoPonto,

    // ausência
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
    abrirModalAusencia,
    salvarAusenciaAdmin,

    // ações e derivados
    carregarDados,
    registrosFiltrados,
    excluirPonto,
    excluirAusencia,
    stats,
  };
}

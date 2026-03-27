'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  X,
  Save,
  UserPlus,
  Pencil,
  Briefcase,
  Clock,
  Copy,
  CheckCircle2,
  MapPin,
  User,
  Monitor,
  Globe,
  Network,
  RefreshCw,
  Trash2,
  Upload,
  AlertTriangle,
  Image as ImageIcon,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { obterEndereco } from '@/utils/geocoding';

// Importação dinâmica do mapa para não quebrar no Server Side
const MapaCaptura = dynamic(() => import('@/components/MapaCaptura'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-elevated-solid animate-pulse rounded-xl flex items-center justify-center text-text-faint">
      Carregando Mapa...
    </div>
  ),
});

// EXPORTAMOS a interface para que a página pai possa usá-la
export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tituloCargo?: string;
  latitudeBase: number;
  longitudeBase: number;
  raioPermitido: number;
  fotoPerfilUrl?: string;
  jornada?: any;
  pontoLivre?: boolean;
  locaisAdicionais?: any[];
  ipsPermitidos?: string;
  modoValidacaoPonto?: string;
  deveCadastrarFoto?: boolean;
  deveDarCienciaCelular?: boolean;
  cienciaCelularDocUrl?: string;
}

interface ModalFuncionarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  funcionarioEdicao: Funcionario | null;
}

function timeToMin(t: string) {
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function validarBloco(e: string, s: string) {
  const me = timeToMin(e);
  const ms = timeToMin(s);
  if (me == null && ms == null) return null;
  if (me == null || ms == null) return 'Preencha entrada e saída';
  if (ms <= me) return 'Saída deve ser maior que entrada';
  return null;
}

const DOMINIOS_SUSPEITOS = [
  'teste.com', 'fake.com', 'example.com', 'test.com',
  'aaa.com', 'xxx.com', 'naotem.com', 'semmail.com', 'email.com',
];
const LOCAIS_SUSPEITOS = ['aaa', '111', 'abc', 'xxx'];

function isEmailSuspect(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const [local, dominio] = email.toLowerCase().split('@');
  if (DOMINIOS_SUSPEITOS.includes(dominio)) return true;
  if (LOCAIS_SUSPEITOS.includes(local)) return true;
  if (dominio && !dominio.includes('.')) return true;
  return false;
}

function uniqSortedNumbers(arr: any[]) {
  const out = Array.from(new Set(arr.map((n) => Number(n)).filter((n) => Number.isFinite(n))));
  out.sort((a, b) => a - b);
  return out;
}

export default function ModalFuncionario({
  isOpen,
  onClose,
  onSuccess,
  funcionarioEdicao,
}: ModalFuncionarioProps) {
  // === ESTADOS ===
  const [loading, setLoading] = useState(false);
  const [capturandoIp, setCapturandoIp] = useState(false);

  // Form Fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tituloCargo, setTituloCargo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [exigirFotoFuncionario, setExigirFotoFuncionario] = useState(false);
  const [exigirCienciaCelular, setExigirCienciaCelular] = useState(false);

  // Upload UX
  const [fotoErro, setFotoErro] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  // Configs Avançadas
  const [pontoLivre, setPontoLivre] = useState(false);
  const [locaisExtras, setLocaisExtras] = useState<any[]>([]);
  const [novoLocal, setNovoLocal] = useState({ nome: '', lat: '', lng: '', raio: '100' });
  const [modoValidacao, setModoValidacao] = useState('GPS');
  const [ipsPermitidos, setIpsPermitidos] = useState('');

  // UX - controle de mapa
  const [mostrarMapaPrincipal, setMostrarMapaPrincipal] = useState(true);

  // Extra: edição/seleção no mapa
  const [modoMapaExtra, setModoMapaExtra] = useState<'NONE' | 'NOVO' | number>('NONE');

  // Campos opcionais de endereço/referência (UI)
  const [enderecoPrincipal, setEnderecoPrincipal] = useState('');
  const [novoLocalEndereco, setNovoLocalEndereco] = useState('');

  // Endereço conferido (reverse geocode)
  const [enderecoConferidoPrincipal, setEnderecoConferidoPrincipal] = useState('');
  const [enderecosConferidosExtras, setEnderecosConferidosExtras] = useState<Record<number, string>>({});

  // evita spam de requests de reverse
  const lastPrincipalKey = useRef<string>('');

  const emailSuspeito = useMemo(() => isEmailSuspect(email), [email]);

  const formatarTelefone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const jornadaPadrao = {
    seg: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    ter: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qua: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qui: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sex: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sab: { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: false },
    dom: { e1: '', s1: '', e2: '', s2: '', ativo: false },
  };

  const [jornada, setJornada] = useState<any>(jornadaPadrao);

  // === EFEITO DE CARREGAMENTO (Edição vs Novo) ===
  useEffect(() => {
    if (!isOpen) return;

    // reset UX
    setModoMapaExtra('NONE');
    setNovoLocalEndereco('');
    setMostrarMapaPrincipal(true);
    setFotoErro('');
    setDragOver(false);

    if (funcionarioEdicao) {
      setNome(funcionarioEdicao.nome);
      setEmail(funcionarioEdicao.email);
      setTelefone(funcionarioEdicao.telefone ? formatarTelefone(funcionarioEdicao.telefone) : '');
      setTituloCargo(funcionarioEdicao.tituloCargo || '');
      setLat(funcionarioEdicao.latitudeBase?.toString() || '');
      setLng(funcionarioEdicao.longitudeBase?.toString() || '');
      setRaio(funcionarioEdicao.raioPermitido?.toString() || '100');
      setJornada(funcionarioEdicao.jornada || jornadaPadrao);
      setPontoLivre(funcionarioEdicao.pontoLivre || false);
      setLocaisExtras(funcionarioEdicao.locaisAdicionais || []);
      setModoValidacao(funcionarioEdicao.modoValidacaoPonto || 'GPS');
      setIpsPermitidos(funcionarioEdicao.ipsPermitidos || '');
      setFotoArquivo(null);
      setExigirFotoFuncionario(funcionarioEdicao.deveCadastrarFoto || false);
      setExigirCienciaCelular(funcionarioEdicao.deveDarCienciaCelular || false);

      setEnderecoPrincipal((funcionarioEdicao as any)?.enderecoPrincipal || '');

      const temCoordenadas = !!funcionarioEdicao.latitudeBase && !!funcionarioEdicao.longitudeBase;
      setMostrarMapaPrincipal(!temCoordenadas);
    } else {
      setNome('');
      setEmail('');
      setTelefone('');
      setTituloCargo('');
      setLat('');
      setLng('');
      setRaio('100');
      setJornada(jornadaPadrao);
      setPontoLivre(false);
      setLocaisExtras([]);
      setFotoArquivo(null);
      setExigirFotoFuncionario(false);
      setExigirCienciaCelular(false);
      setModoValidacao('GPS');
      setIpsPermitidos('');
      setEnderecoPrincipal('');
      setNovoLocal({ nome: '', lat: '', lng: '', raio: '100' });
      setNovoLocalEndereco('');
      setModoMapaExtra('NONE');
      setMostrarMapaPrincipal(true);
    }
  }, [isOpen, funcionarioEdicao]);

  // === LÓGICA DE JORNADA ===
  const updateJornada = (dia: string, campo: string, valor: any) => {
    setJornada((prev: any) => {
      const diaAtual = prev?.[dia] || {};
      const novoDia = { ...diaAtual, [campo]: valor };

      // ✅ Se está ativando o sábado, garante regra SABADOS_DO_MES (com quais vazio = não cobra meta até selecionar)
      if (dia === 'sab' && campo === 'ativo' && valor === true) {
        if (!novoDia.regra || novoDia.regra?.tipo !== 'SABADOS_DO_MES') {
          novoDia.regra = { tipo: 'SABADOS_DO_MES', quais: [] };
        } else {
          // normaliza caso venha bagunçado
          novoDia.regra = {
            tipo: 'SABADOS_DO_MES',
            quais: uniqSortedNumbers(Array.isArray(novoDia.regra?.quais) ? novoDia.regra.quais : []),
          };
        }
      }

      // ✅ Se está desativando o sábado, remove a regra (limpa)
      if (dia === 'sab' && campo === 'ativo' && valor === false) {
        if (novoDia.regra) {
          const copy = { ...novoDia };
          delete copy.regra;
          return { ...prev, [dia]: copy };
        }
      }

      return { ...prev, [dia]: novoDia };
    });
  };

  const toggleSabadoDoMes = (n: number) => {
    setJornada((prev: any) => {
      const sab = prev?.sab || {};
      const regra = sab?.regra && sab.regra.tipo === 'SABADOS_DO_MES' ? sab.regra : { tipo: 'SABADOS_DO_MES', quais: [] };
      const atuais = uniqSortedNumbers(Array.isArray(regra.quais) ? regra.quais : []);
      const has = atuais.includes(n);
      const novos = has ? atuais.filter((x) => x !== n) : uniqSortedNumbers([...atuais, n]);

      return {
        ...prev,
        sab: {
          ...sab,
          // mantém o sábado ativo (por segurança)
          ativo: true,
          regra: { tipo: 'SABADOS_DO_MES', quais: novos },
        },
      };
    });
  };

  const replicarHorarioSegunda = () => {
    const base = jornada['seg'];
    if (!base) return;
    const novaJornada = { ...jornada };
    ['ter', 'qua', 'qui', 'sex'].forEach((dia) => {
      novaJornada[dia] = { ...base };
    });
    setJornada(novaJornada);
    toast.success('Horário de Segunda replicado até Sexta!');
  };

  const errosJornada = useMemo(() => {
    const out: Record<string, string[]> = {};
    (['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as string[]).forEach((dia) => {
      if (!jornada?.[dia]?.ativo) return;
      const { e1, s1, e2, s2 } = jornada[dia];
      const temE1 = !!e1;
      const temS1 = !!s1;
      const temE2 = !!e2;
      const temS2 = !!s2;

      // Turno contínuo: só entrada (e1) e saída (s2), sem almoço — válido
      if (temE1 && temS2 && !temS1 && !temE2) {
        const err = validarBloco(e1, s2);
        if (err) out[dia] = [err];
        return;
      }

      // Se preencheu almoço ou volta, valida os dois blocos
      const err1 = validarBloco(e1, s1);
      const err2 = validarBloco(e2, s2);
      const arr = [err1, err2].filter(Boolean) as string[];
      if (arr.length) out[dia] = arr;
    });
    return out;
  }, [jornada]);

  // === LÓGICA DE LOCALIZAÇÃO / IP ===
  const capturarIpAtual = async () => {
    setCapturandoIp(true);
    try {
      let ipPublico = '';
      try {
        const res = await axios.get('https://api.ipify.org?format=json');
        ipPublico = res.data.ip;
      } catch {}

      let ipServidor = '';
      try {
        const res = await axios.get('/api/utils/ip');
        ipServidor = res.data.ip;
      } catch {}

      const ipFinal = ipPublico || ipServidor;
      if (ipFinal) {
        const ipsAtuais = ipsPermitidos.split(',').map((s) => s.trim()).filter(Boolean);
        if (!ipsAtuais.includes(ipFinal)) {
          const novoValor = ipsAtuais.length > 0 ? `${ipsPermitidos}, ${ipFinal}` : ipFinal;
          setIpsPermitidos(novoValor);
          toast.success(`IP ${ipFinal} adicionado.`);
        } else {
          toast.info(`IP ${ipFinal} já está na lista.`);
        }
      } else {
        toast.error('Não foi possível detectar IP.');
      }
    } catch {
      toast.error('Erro ao buscar IP.');
    } finally {
      setCapturandoIp(false);
    }
  };

  const pegarLocalizacaoAtual = (destino: 'PRINCIPAL' | 'EXTRA') => {
    if (!navigator.geolocation) return toast.error('Geolocalização não suportada.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (destino === 'PRINCIPAL') {
          setLat(String(pos.coords.latitude));
          setLng(String(pos.coords.longitude));
          setMostrarMapaPrincipal(false);
        } else {
          setNovoLocal({
            ...novoLocal,
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude),
          });
        }
      },
      () => toast.error('Erro ao pegar GPS.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const removeLocalExtra = (idx: number) => {
    const nova = [...locaisExtras];
    nova.splice(idx, 1);
    setLocaisExtras(nova);

    setEnderecosConferidosExtras((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });

    if (typeof modoMapaExtra === 'number' && modoMapaExtra === idx) {
      setModoMapaExtra('NONE');
    }
  };

  // Clique no mapa: decide se vai para sede, novo extra, ou extra existente
  const aoClicarNoMapa = (novaLat: number, novaLng: number) => {
    if (modoMapaExtra === 'NOVO') {
      setNovoLocal({ ...novoLocal, lat: String(novaLat), lng: String(novaLng) });
      return;
    }

    if (typeof modoMapaExtra === 'number') {
      const idx = modoMapaExtra;
      const novaLista = [...locaisExtras];
      novaLista[idx] = { ...novaLista[idx], lat: String(novaLat), lng: String(novaLng) };
      setLocaisExtras(novaLista);
      return;
    }

    setLat(String(novaLat));
    setLng(String(novaLng));
    setMostrarMapaPrincipal(false);
  };

  // Reverse geocode do principal quando muda
  useEffect(() => {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || !la || !lo) {
      setEnderecoConferidoPrincipal('');
      return;
    }

    const key = `${la.toFixed(6)}|${lo.toFixed(6)}`;
    if (lastPrincipalKey.current === key) return;
    lastPrincipalKey.current = key;

    let alive = true;
    (async () => {
      const addr = await obterEndereco(la, lo);
      if (alive) setEnderecoConferidoPrincipal(addr);
    })();

    return () => {
      alive = false;
    };
  }, [lat, lng]);

  // Reverse geocode dos extras (quando mudarem lat/lng)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      const updates: Record<number, string> = {};
      for (let i = 0; i < locaisExtras.length; i++) {
        const la = Number(locaisExtras[i]?.lat);
        const lo = Number(locaisExtras[i]?.lng);
        if (!Number.isFinite(la) || !Number.isFinite(lo) || !la || !lo) continue;

        if (!enderecosConferidosExtras[i]) {
          updates[i] = await obterEndereco(la, lo);
        }
      }

      if (alive && Object.keys(updates).length) {
        setEnderecosConferidosExtras((prev) => ({ ...prev, ...updates }));
      }
    };

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locaisExtras]);

  // === FOTO: validação + drag/drop ===
  const validarFoto = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) return 'Envie uma imagem (JPG/PNG).';

    const max = 5 * 1024 * 1024;
    if (file.size > max) return 'Imagem muito grande. Máx: 5MB.';

    return '';
  };

  const onFotoSelecionada = (file: File | null) => {
    if (!file) return;
    const err = validarFoto(file);
    if (err) {
      setFotoErro(err);
      return;
    }
    setFotoErro('');
    setFotoArquivo(file);
  };

  // === SALVAR ===
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modoValidacao === 'GPS' && !pontoLivre && (!lat || !lng))
      return toast.error('Modo GPS exige localização!');

    if (modoValidacao === 'PC_IP' && !ipsPermitidos)
      return toast.error('Modo IP exige IPs cadastrados!');

    const temErroJornada = Object.keys(errosJornada).length > 0;
    if (temErroJornada) {
      toast.warning('Existem horários inválidos em alguns dias. Verifique antes de salvar.');
    }

    if (!funcionarioEdicao && emailSuspeito) {
      const confirma = window.confirm(
        'Este email parece não ser real. O funcionário não receberá emails do sistema. Deseja continuar?'
      );
      if (!confirma) return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('telefone', telefone.replace(/\D/g, ''));
      formData.append('tituloCargo', tituloCargo);
      formData.append('latitude', lat || '0');
      formData.append('longitude', lng || '0');
      formData.append('raio', raio);
      formData.append('jornada', JSON.stringify(jornada));
      formData.append('pontoLivre', String(pontoLivre));
      formData.append('locaisAdicionais', JSON.stringify(locaisExtras));
      formData.append('modoValidacaoPonto', modoValidacao);
      formData.append('ipsPermitidos', ipsPermitidos);

      if (fotoArquivo) formData.append('foto', fotoArquivo);
      formData.append('exigirFotoFuncionario', String(exigirFotoFuncionario));
      formData.append('exigirCienciaCelular', String(exigirCienciaCelular));

      if (funcionarioEdicao?.id) {
        formData.append('id', funcionarioEdicao.id);
        await axios.put('/api/admin/funcionarios', formData);
        toast.success('Atualizado com sucesso!');
      } else {
        await axios.post('/api/admin/funcionarios', formData);
        toast.success('Cadastrado com sucesso! Senha inicial: 1234');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.erro || 'Erro ao salvar.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sabQuais: number[] = useMemo(() => {
    const regra = jornada?.sab?.regra;
    if (jornada?.sab?.ativo && regra?.tipo === 'SABADOS_DO_MES') {
      return uniqSortedNumbers(Array.isArray(regra?.quais) ? regra.quais : []);
    }
    return [];
  }, [jornada]);

  if (!isOpen) return null;

  

  return (
    <div className="fixed inset-0 z-[60] md:flex md:items-center md:justify-center bg-page md:bg-overlay md:backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      <div className="bg-page md:bg-surface-solid w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:border md:border-border-default shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border-subtle flex justify-between items-center bg-surface-solid/80 backdrop-blur-sm md:rounded-t-2xl sticky top-0 z-10 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
          <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-3">
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              {funcionarioEdicao ? (
                <Pencil size={18} className="text-blue-400" />
              ) : (
                <UserPlus size={18} className="text-emerald-400" />
              )}
            </div>
            {funcionarioEdicao ? 'Editar Funcionário' : 'Novo Cadastro'}
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl text-text-muted hover:text-text-primary transition-colors border border-border-subtle active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
          <form id="formFuncionario" onSubmit={salvar} className="space-y-6">
            {/* 1. DADOS PESSOAIS */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-faint uppercase tracking-wider border-b border-border-subtle pb-2">
                Dados Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block">
                    Nome Completo
                  </label>
                  <input
                    className="w-full bg-page border border-border-input p-3.5 rounded-xl text-text-primary outline-none focus:border-purple-500 transition-colors"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Ex: Maria Silva"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block">
                    Email (Login)
                  </label>
                  <input
                    type="email"
                    className="w-full bg-page border border-border-input p-3.5 rounded-xl text-text-primary outline-none focus:border-purple-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@exemplo.com"
                  />
                  {emailSuspeito && (
                    <div className="mt-2 flex items-start gap-2 bg-amber-900/30 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-xs leading-relaxed">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>
                        Se este email não for real, o funcionário <strong>não receberá</strong> o email de boas-vindas e <strong>não conseguirá</strong> recuperar a senha sozinho. O admin terá que resetar a senha manualmente.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Phone size={12} /> Celular / WhatsApp
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-page border border-border-input p-3.5 rounded-xl text-text-primary outline-none focus:border-purple-500 transition-colors"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Briefcase size={12} /> Cargo
                  </label>
                  <input
                    placeholder="Ex: Vendedor"
                    className="w-full bg-page border border-border-input p-3.5 rounded-xl text-text-primary outline-none focus:border-purple-500 transition-colors"
                    value={tituloCargo}
                    onChange={(e) => setTituloCargo(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 2. JORNADA */}
            <section className="space-y-4">
              <div className="flex justify-between items-end border-b border-border-subtle pb-2">
                <h3 className="text-sm font-bold text-text-faint uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} /> Horários
                </h3>
                <button
                  type="button"
                  onClick={replicarHorarioSegunda}
                  className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors active:scale-95"
                >
                  <Copy size={12} /> Copiar Seg → Sexta
                </button>
              </div>

              {Object.keys(errosJornada).length > 0 && (
                <div className="flex items-start gap-2 bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-3">
                  <AlertTriangle className="text-amber-400 mt-0.5" size={16} />
                  <div className="text-xs text-yellow-100">
                    Existem horários inválidos em alguns dias. Corrija para evitar inconsistências no ponto.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as string[]).map((dia) => {
                  const diaErros = errosJornada[dia] || [];
                  const diaLabel: Record<string, string> = {
                    seg: 'Segunda', ter: 'Terça', qua: 'Quarta',
                    qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo',
                  };
                  return (
                    <div
                      key={dia}
                      className={`relative rounded-2xl border transition-all overflow-hidden ${
                        jornada[dia]?.ativo
                          ? 'bg-surface border-border-default'
                          : 'bg-input-solid/30 border-border-subtle opacity-60'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between p-3.5 ${
                          jornada[dia]?.ativo ? 'bg-white/[0.02]' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-bold text-sm text-text-secondary flex items-center gap-2">
                          {diaLabel[dia] || dia.toUpperCase()}
                          {jornada[dia]?.ativo && <CheckCircle2 size={12} className="text-green-500" />}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jornada[dia]?.ativo}
                            onChange={(e) => updateJornada(dia, 'ativo', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-border-input peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
                        </label>
                      </div>

                      {jornada[dia]?.ativo && (
                        <div className="p-3.5 pt-0 space-y-2">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <p className="text-[10px] text-text-faint font-bold uppercase text-center">Entrada</p>
                              <input
                                type="time"
                                value={jornada[dia].e1}
                                onChange={(e) => updateJornada(dia, 'e1', e.target.value)}
                                className="w-full bg-page border border-border-input text-text-primary text-sm font-mono text-center outline-none py-2.5 rounded-xl focus:border-purple-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-text-faint font-bold uppercase text-center">Almoço</p>
                              <input
                                type="time"
                                value={jornada[dia].s1}
                                onChange={(e) => updateJornada(dia, 's1', e.target.value)}
                                className="w-full bg-page border border-border-input text-text-primary text-sm font-mono text-center outline-none py-2.5 rounded-xl focus:border-purple-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-text-faint font-bold uppercase text-center">Volta</p>
                              <input
                                type="time"
                                value={jornada[dia].e2}
                                onChange={(e) => updateJornada(dia, 'e2', e.target.value)}
                                className="w-full bg-page border border-border-input text-text-primary text-sm font-mono text-center outline-none py-2.5 rounded-xl focus:border-purple-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-text-faint font-bold uppercase text-center">Saída</p>
                              <input
                                type="time"
                                value={jornada[dia].s2}
                                onChange={(e) => updateJornada(dia, 's2', e.target.value)}
                                className="w-full bg-page border border-border-input text-text-primary text-sm font-mono text-center outline-none py-2.5 rounded-xl focus:border-purple-500 transition-colors"
                              />
                            </div>
                          </div>

                          {/* Regra do sábado (sábados do mês) */}
                          {dia === 'sab' && (
                            <div className="mt-2 bg-page border border-border-input rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-text-faint font-bold uppercase">
                                  Sábados do mês que trabalha
                                </p>
                                <span className="text-[10px] text-text-faint">
                                  (marque 1-5)
                                </span>
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((n) => {
                                  const active = sabQuais.includes(n);
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => toggleSabadoDoMes(n)}
                                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                        active
                                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                                          : 'bg-hover-bg border-border-default text-text-secondary hover:border-white/20'
                                      }`}
                                      title={`${n}º sábado do mês`}
                                    >
                                      {n}º
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="text-[10px] text-text-muted leading-relaxed">
                                • Se não marcar nenhum, o sistema considera folga e <b>não cobra meta</b> no sábado. <br />
                                • Ex.: 1º e 3º sábado → marque <b>1º</b> e <b>3º</b>.
                              </div>
                            </div>
                          )}

                          {diaErros.length > 0 && (
                            <div className="text-[10px] text-yellow-200 bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-2">
                              {diaErros.map((m, i) => (
                                <div key={i}>• {m}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. LOCALIZAÇÃO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-faint uppercase tracking-wider border-b border-border-subtle pb-2 flex items-center gap-2">
                <MapPin size={16} /> Validação de Ponto
              </h3>

              <div className="bg-surface p-4 rounded-2xl border border-border-subtle">
                <label className="text-xs font-bold text-text-muted mb-3 block">Modo de Validação</label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModoValidacao('GPS')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all w-full active:scale-95 ${
                      modoValidacao === 'GPS'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                        : 'bg-hover-bg border-border-default text-text-muted hover:border-white/20'
                    }`}
                  >
                    <MapPin size={22} />
                    <span className="text-xs font-bold">GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoValidacao('PC_IP')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all w-full active:scale-95 ${
                      modoValidacao === 'PC_IP'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        : 'bg-hover-bg border-border-default text-text-muted hover:border-white/20'
                    }`}
                  >
                    <Monitor size={22} />
                    <span className="text-xs font-bold">IP (Wifi/Cabo)</span>
                  </button>
                </div>
              </div>

              {modoValidacao === 'GPS' && (
                <div className="space-y-4 animate-in fade-in">
                  <label className="flex items-center gap-3 bg-surface p-4 rounded-2xl border border-border-subtle cursor-pointer hover:border-border-default transition-colors">
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        pontoLivre ? 'bg-purple-600 border-purple-600' : 'border-border-input'
                      }`}
                    >
                      {pontoLivre && <User size={12} className="text-text-primary" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={pontoLivre}
                      onChange={(e) => setPontoLivre(e.target.checked)}
                      className="hidden"
                    />
                    <div>
                      <span className="font-bold block text-sm text-text-primary">Trabalho Externo (Livre)</span>
                      <span className="text-xs text-text-muted">Pode bater ponto em qualquer lugar.</span>
                    </div>
                  </label>

                  {!pontoLivre && (
                    <div className="space-y-4">
                      {/* Sede Principal */}
                      <div className="bg-surface p-4 rounded-2xl border border-border-subtle space-y-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 uppercase">Sede Principal</span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setModoMapaExtra('NONE');
                                setMostrarMapaPrincipal((v) => !v);
                              }}
                              className="text-xs bg-hover-bg text-text-secondary px-3 py-2 rounded-xl flex items-center gap-1.5 border border-border-default hover:bg-hover-bg-strong transition-colors active:scale-95"
                            >
                              <MapPin size={12} /> {mostrarMapaPrincipal ? 'Ocultar mapa' : 'Editar no mapa'}
                            </button>

                            <button
                              type="button"
                              onClick={() => pegarLocalizacaoAtual('PRINCIPAL')}
                              className="text-xs bg-blue-500/10 text-blue-400 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-blue-500/20 hover:bg-blue-500/20 transition-colors active:scale-95"
                            >
                              <MapPin size={12} /> Pegar GPS
                            </button>
                          </div>
                        </div>

                        {/* Endereço referência */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-faint font-bold uppercase">
                            Endereço / Referência (opcional)
                          </label>
                          <input
                            placeholder="Ex: Av. Brasil, 123 - Centro"
                            value={enderecoPrincipal}
                            onChange={(e) => setEnderecoPrincipal(e.target.value)}
                            className="w-full bg-page border border-border-input p-3 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                          />
                        </div>

                        {!!enderecoConferidoPrincipal && (
                          <div className="bg-page border border-border-input rounded-xl p-3">
                            <p className="text-[10px] text-text-faint font-bold uppercase">Endereço conferido</p>
                            <p className="text-xs text-text-secondary mt-1">{enderecoConferidoPrincipal}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            placeholder="Lat"
                            value={lat}
                            onChange={(e) => setLat(e.target.value)}
                            className="bg-page border border-border-input p-3 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                          />
                          <input
                            placeholder="Lng"
                            value={lng}
                            onChange={(e) => setLng(e.target.value)}
                            className="bg-page border border-border-input p-3 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                          />
                          <div className="relative">
                            <input
                              type="number"
                              value={raio}
                              onChange={(e) => setRaio(e.target.value)}
                              className="w-full bg-page border border-border-input p-3 rounded-xl text-xs text-text-primary pl-12 focus:border-purple-500 outline-none transition-colors"
                            />
                            <span className="absolute left-3 top-3.5 text-xs text-text-faint">Raio:</span>
                          </div>
                        </div>

                        {mostrarMapaPrincipal && (
                          <div className="pt-2">
                            <MapaCaptura latInicial={lat} lngInicial={lng} aoSelecionar={aoClicarNoMapa} raio={Number(raio) || 0} />
                            <p className="text-[10px] text-text-faint mt-2">
                              Use CEP + número para máxima precisão, e ajuste clicando no mapa se necessário.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Locais Extras */}
                      <div className="bg-surface p-4 rounded-2xl border border-border-subtle space-y-3">
                        <p className="text-xs font-bold text-text-muted uppercase">Locais Extras</p>

                        {locaisExtras.map((loc, idx) => (
                          <div key={idx} className="bg-page p-3 rounded-xl border border-border-input space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-text-primary">{loc.nome}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModoMapaExtra(idx);
                                    setMostrarMapaPrincipal(false);
                                  }}
                                  className="text-xs bg-hover-bg text-blue-300 px-2.5 py-1.5 rounded-xl border border-border-default hover:bg-hover-bg-strong transition-colors active:scale-95"
                                >
                                  Editar no mapa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLocalExtra(idx)}
                                  className="text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Remover local"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {!!enderecosConferidosExtras[idx] && (
                              <div className="bg-white/[0.02] border border-border-default rounded-xl p-2">
                                <p className="text-[10px] text-text-faint font-bold uppercase">Endereço conferido</p>
                                <p className="text-xs text-text-secondary mt-1">{enderecosConferidosExtras[idx]}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input
                                placeholder="Lat"
                                value={loc.lat || ''}
                                onChange={(e) => {
                                  const nova = [...locaisExtras];
                                  nova[idx] = { ...nova[idx], lat: e.target.value };
                                  setLocaisExtras(nova);
                                }}
                                className="bg-page border border-border-input p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                              />
                              <input
                                placeholder="Lng"
                                value={loc.lng || ''}
                                onChange={(e) => {
                                  const nova = [...locaisExtras];
                                  nova[idx] = { ...nova[idx], lng: e.target.value };
                                  setLocaisExtras(nova);
                                }}
                                className="bg-page border border-border-input p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                              />
                              <input
                                placeholder="Raio (m)"
                                type="number"
                                value={loc.raio || '100'}
                                onChange={(e) => {
                                  const nova = [...locaisExtras];
                                  nova[idx] = { ...nova[idx], raio: e.target.value };
                                  setLocaisExtras(nova);
                                }}
                                className="bg-page border border-border-input p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Novo Local Extra */}
                        <div className="mt-3 p-3 rounded-xl border border-border-input bg-page space-y-2">
                          <p className="text-[10px] text-text-faint font-bold uppercase">Adicionar novo local</p>

                          <input
                            placeholder="Nome do Local (Ex: Filial Centro)"
                            value={novoLocal.nome}
                            onChange={(e) => setNovoLocal({ ...novoLocal, nome: e.target.value })}
                            className="w-full bg-hover-bg border border-border-default p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                          />

                          <input
                            placeholder="Endereço / Referência (opcional)"
                            value={novoLocalEndereco}
                            onChange={(e) => setNovoLocalEndereco(e.target.value)}
                            className="w-full bg-hover-bg border border-border-default p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                          />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              placeholder="Lat"
                              value={novoLocal.lat}
                              onChange={(e) => setNovoLocal({ ...novoLocal, lat: e.target.value })}
                              className="bg-hover-bg border border-border-default p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                            />
                            <input
                              placeholder="Lng"
                              value={novoLocal.lng}
                              onChange={(e) => setNovoLocal({ ...novoLocal, lng: e.target.value })}
                              className="bg-hover-bg border border-border-default p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                            />
                            <input
                              placeholder="Raio (m)"
                              type="number"
                              value={novoLocal.raio}
                              onChange={(e) => setNovoLocal({ ...novoLocal, raio: e.target.value })}
                              className="bg-hover-bg border border-border-default p-2.5 rounded-xl text-xs text-text-primary focus:border-purple-500 outline-none transition-colors"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => pegarLocalizacaoAtual('EXTRA')}
                              className="flex-1 bg-hover-bg text-blue-400 p-2.5 rounded-xl border border-border-default text-xs font-bold flex items-center justify-center gap-2 hover:bg-hover-bg-strong transition-colors active:scale-95"
                            >
                              <MapPin size={16} /> Pegar GPS
                            </button>

                            <button
                              type="button"
                              onClick={() => setModoMapaExtra('NOVO')}
                              className="flex-1 bg-hover-bg text-purple-300 p-2.5 rounded-xl border border-border-default text-xs font-bold hover:bg-hover-bg-strong transition-colors active:scale-95"
                            >
                              Selecionar no mapa
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!novoLocal.nome || !novoLocal.lat || !novoLocal.lng)
                                  return toast.error('Defina nome e localização (lat/lng).');

                                setLocaisExtras([
                                  ...locaisExtras,
                                  { ...novoLocal, endereco: novoLocalEndereco },
                                ]);

                                setNovoLocal({ nome: '', lat: '', lng: '', raio: '100' });
                                setNovoLocalEndereco('');
                                setModoMapaExtra('NONE');
                              }}
                              className="bg-emerald-600/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20 font-bold text-xs hover:bg-emerald-600/30 transition-all active:scale-95"
                            >
                              ADD
                            </button>
                          </div>

                          {modoMapaExtra === 'NOVO' && (
                            <div className="pt-2">
                              <MapaCaptura
                                latInicial={novoLocal.lat}
                                lngInicial={novoLocal.lng}
                                aoSelecionar={aoClicarNoMapa}
                                raio={Number(novoLocal.raio) || 0}
                              />
                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setModoMapaExtra('NONE')}
                                  className="text-xs bg-hover-bg text-text-secondary px-3 py-1.5 rounded-xl border border-border-default hover:bg-hover-bg-strong transition-colors active:scale-95"
                                >
                                  Fechar mapa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {typeof modoMapaExtra === 'number' && (
                          <div className="pt-2">
                            <MapaCaptura
                              latInicial={String(locaisExtras[modoMapaExtra]?.lat || '')}
                              lngInicial={String(locaisExtras[modoMapaExtra]?.lng || '')}
                              aoSelecionar={aoClicarNoMapa}
                              raio={Number(locaisExtras[modoMapaExtra]?.raio) || 0}
                            />
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setModoMapaExtra('NONE')}
                                className="text-xs bg-elevated-solid text-text-secondary px-3 py-1.5 rounded border border-border-input"
                              >
                                Fechar mapa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modoValidacao === 'PC_IP' && (
                <div className="bg-surface p-4 rounded-2xl border border-border-subtle space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
                    <Monitor className="text-emerald-400" size={20} />
                    <div>
                      <p className="text-sm font-bold text-emerald-100">Controle por IP</p>
                      <p className="text-[10px] text-emerald-300/70">
                        O funcionário só poderá bater ponto conectado nestas redes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block">IPs Permitidos</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="Ex: 191.23.45.67"
                        value={ipsPermitidos}
                        onChange={(e) => setIpsPermitidos(e.target.value)}
                        className="flex-1 bg-page border border-border-input p-3 rounded-xl text-xs text-text-primary font-mono focus:border-purple-500 outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={capturarIpAtual}
                        disabled={capturandoIp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all"
                      >
                        {capturandoIp ? <RefreshCw className="animate-spin" size={16} /> : <Globe size={16} />}{' '}
                        Capturar
                      </button>
                    </div>
                    <p className="text-[10px] text-text-faint mt-2 flex items-center gap-1">
                      <Network size={10} /> Use IPs fixos ou públicos.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 4. FOTO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-faint uppercase tracking-wider border-b border-border-subtle pb-2 flex items-center gap-2">
                <Upload size={16} /> Biometria (Foto)
              </h3>

              <div
                className={`bg-surface p-6 rounded-2xl border border-border-default border-dashed flex flex-col items-center justify-center text-center gap-3 transition-colors ${
                  dragOver ? 'bg-hover-bg' : 'hover:bg-white/[0.02]'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) onFotoSelecionada(file);
                }}
              >
                {fotoArquivo ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(fotoArquivo)}
                      className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
                      alt="Prévia"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoArquivo(null);
                        setFotoErro('');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                      title="Remover foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-elevated-solid rounded-full flex items-center justify-center">
                    <ImageIcon size={28} className="text-text-faint" />
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="foto-upload"
                    className="block text-purple-400 font-bold text-sm cursor-pointer hover:underline"
                  >
                    {funcionarioEdicao ? 'Alterar Foto Atual' : 'Enviar Foto'}
                  </label>
                  <p className="text-[10px] text-text-faint">
                    Dica: foto frontal, boa luz, sem óculos/boné. (JPG/PNG até 5MB)
                  </p>
                </div>

                {fotoErro && (
                  <div className="text-[11px] text-red-200 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                    {fotoErro}
                  </div>
                )}

                <input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFotoSelecionada(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {/* Checkbox: exigir foto do funcionário no primeiro acesso */}
              {!fotoArquivo && !funcionarioEdicao?.fotoPerfilUrl ? (
                <label className="flex items-start gap-3 bg-elevated p-4 rounded-xl border border-border-subtle cursor-pointer hover:bg-elevated-solid/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={exigirFotoFuncionario}
                    onChange={(e) => setExigirFotoFuncionario(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-500 rounded"
                  />
                  <div>
                    <span className="text-sm text-text-secondary font-medium">
                      Exigir que o funcionário envie sua foto no primeiro acesso
                    </span>
                    <p className="text-[11px] text-text-faint mt-1">
                      Após trocar a senha, o funcionário será obrigado a tirar uma selfie antes de acessar o sistema.
                    </p>
                  </div>
                </label>
              ) : (
                <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/20 p-3 rounded-xl">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-green-300">Foto de referência cadastrada</span>
                </div>
              )}

              {/* Checkbox: exigir ciência de uso de celular */}
              {!funcionarioEdicao?.cienciaCelularDocUrl ? (
                <label className="flex items-start gap-3 bg-elevated p-4 rounded-xl border border-border-subtle cursor-pointer hover:bg-elevated-solid/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={exigirCienciaCelular}
                    onChange={(e) => setExigirCienciaCelular(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-500 rounded"
                  />
                  <div>
                    <span className="text-sm text-text-secondary font-medium">
                      Exigir ciência de uso de celular pessoal
                    </span>
                    <p className="text-[11px] text-text-faint mt-1">
                      O funcionário deverá informar o CPF e declarar se usará celular próprio ou da empresa para bater ponto. Um PDF será gerado automaticamente.
                    </p>
                  </div>
                </label>
              ) : (
                <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-500/20 p-3 rounded-xl">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-blue-300">Termo de ciência assinado</span>
                  <a
                    href={funcionarioEdicao.cienciaCelularDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Ver PDF
                  </a>
                </div>
              )}
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-border-subtle bg-surface-solid/80 backdrop-blur-sm md:rounded-b-2xl sticky bottom-0 z-10 flex-shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <button
            onClick={salvar}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-text-primary shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base active:scale-95 ${
              funcionarioEdicao ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
            }`}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={20} /> {funcionarioEdicao ? 'Atualizar Dados' : 'Finalizar Cadastro'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

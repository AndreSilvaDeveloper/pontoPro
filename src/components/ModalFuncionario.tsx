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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { obterEndereco } from '@/utils/geocoding';

// Importação dinâmica do mapa para não quebrar no Server Side
const MapaCaptura = dynamic(() => import('@/components/MapaCaptura'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-500">
      Carregando Mapa...
    </div>
  ),
});

// EXPORTAMOS a interface para que a página pai possa usá-la
export interface Funcionario {
  id: string;
  nome: string;
  email: string;
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
  const [tituloCargo, setTituloCargo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);

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

      setEnderecoPrincipal((funcionarioEdicao as any)?.enderecoPrincipal || '');

      const temCoordenadas = !!funcionarioEdicao.latitudeBase && !!funcionarioEdicao.longitudeBase;
      setMostrarMapaPrincipal(!temCoordenadas);
    } else {
      setNome('');
      setEmail('');
      setTituloCargo('');
      setLat('');
      setLng('');
      setRaio('100');
      setJornada(jornadaPadrao);
      setPontoLivre(false);
      setLocaisExtras([]);
      setFotoArquivo(null);
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
    setJornada((prev: any) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const replicarHorarioSegunda = () => {
    const base = jornada['seg'];
    if (!base) return;
    const novaJornada = { ...jornada };
    ['ter', 'qua', 'qui', 'sex'].forEach((dia) => {
      novaJornada[dia] = { ...base };
    });
    setJornada(novaJornada);
    alert('Horário de Segunda replicado até Sexta!');
  };

  const errosJornada = useMemo(() => {
    const out: Record<string, string[]> = {};
    (['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as string[]).forEach((dia) => {
      if (!jornada?.[dia]?.ativo) return;
      const e1 = validarBloco(jornada[dia].e1, jornada[dia].s1);
      const e2 = validarBloco(jornada[dia].e2, jornada[dia].s2);
      const arr = [e1, e2].filter(Boolean) as string[];
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
        } else {
          alert(`IP ${ipFinal} já está na lista.`);
        }
      } else {
        alert('Não foi possível detectar IP.');
      }
    } catch {
      alert('Erro ao buscar IP.');
    } finally {
      setCapturandoIp(false);
    }
  };

  const pegarLocalizacaoAtual = (destino: 'PRINCIPAL' | 'EXTRA') => {
    if (!navigator.geolocation) return alert('Geolocalização não suportada');
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
      () => alert('Erro ao pegar GPS.'),
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
      // reindex simples: recalcula no useEffect abaixo quando necessário
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

        // se já tem igual, pula
        const current = enderecosConferidosExtras[i];
        if (current && current.includes(la.toFixed(4)) === false) {
          // não dá pra comparar perfeito, então só atualiza se não existe ainda
        }
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

    // 5MB (ajuste se quiser)
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
      return alert('Modo GPS exige localização!');

    if (modoValidacao === 'PC_IP' && !ipsPermitidos)
      return alert('Modo IP exige IPs cadastrados!');

    // Validação suave de jornada (não impede salvar por padrão, mas você pode exigir)
    const temErroJornada = Object.keys(errosJornada).length > 0;
    if (temErroJornada) {
      const ok = confirm(
        'Existem horários inválidos em alguns dias. Quer salvar mesmo assim?',
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('tituloCargo', tituloCargo);
      formData.append('latitude', lat || '0');
      formData.append('longitude', lng || '0');
      formData.append('raio', raio);
      formData.append('jornada', JSON.stringify(jornada));
      formData.append('pontoLivre', String(pontoLivre));
      formData.append('locaisAdicionais', JSON.stringify(locaisExtras));
      formData.append('modoValidacaoPonto', modoValidacao);
      formData.append('ipsPermitidos', ipsPermitidos);

      // endereçoPrincipal é UI. Só envie se seu backend aceitar campos extras:
      // formData.append('enderecoPrincipal', enderecoPrincipal);

      if (fotoArquivo) formData.append('foto', fotoArquivo);

      if (funcionarioEdicao?.id) {
        formData.append('id', funcionarioEdicao.id);
        await axios.put('/api/admin/funcionarios', formData);
        alert('Atualizado com sucesso!');
      } else {
        await axios.post('/api/admin/funcionarios', formData);
        alert('Cadastrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.erro || 'Erro ao salvar.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:flex md:items-center md:justify-center bg-slate-950 md:bg-black/80 md:backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      <div className="bg-slate-950 md:bg-slate-900 w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:border md:border-slate-700 shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 md:rounded-t-2xl sticky top-0 z-10 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            {funcionarioEdicao ? (
              <>
                <Pencil size={20} className="text-blue-400" /> Editar Funcionario
              </>
            ) : (
              <>
                <UserPlus size={20} className="text-green-400" /> Novo Cadastro
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
          <form id="formFuncionario" onSubmit={salvar} className="space-y-6">
            {/* 1. DADOS PESSOAIS */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">
                Dados Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                    Nome Completo
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Ex: Maria Silva"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                    Email (Login)
                  </label>
                  <input
                    type="email"
                    className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-2">
                  <Briefcase size={12} /> Cargo
                </label>
                <input
                  placeholder="Ex: Vendedor"
                  className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500"
                  value={tituloCargo}
                  onChange={(e) => setTituloCargo(e.target.value)}
                />
              </div>
            </section>

            {/* 2. JORNADA */}
            <section className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} /> Horários
                </h3>
                <button
                  type="button"
                  onClick={replicarHorarioSegunda}
                  className="text-[10px] bg-purple-900/30 text-purple-400 border border-purple-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-600 hover:text-white transition-colors"
                >
                  <Copy size={12} /> Copiar Seg para Semana
                </button>
              </div>

              {/* aviso geral */}
              {Object.keys(errosJornada).length > 0 && (
                <div className="flex items-start gap-2 bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-3">
                  <AlertTriangle className="text-yellow-300 mt-0.5" size={16} />
                  <div className="text-xs text-yellow-100">
                    Existem horários inválidos em alguns dias. Corrija para evitar inconsistências no ponto.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as string[]).map((dia) => {
                  const diaErros = errosJornada[dia] || [];
                  return (
                    <div
                      key={dia}
                      className={`relative rounded-xl border transition-all overflow-hidden ${
                        jornada[dia]?.ativo
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-slate-950/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between p-3 ${
                          jornada[dia]?.ativo ? 'bg-slate-800/50' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-bold uppercase text-sm text-slate-300 flex items-center gap-2">
                          {dia}
                          {jornada[dia]?.ativo && <CheckCircle2 size={12} className="text-green-500" />}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jornada[dia]?.ativo}
                            onChange={(e) => updateJornada(dia, 'ativo', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                      </div>

                      {jornada[dia]?.ativo && (
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-500 font-bold uppercase text-center">Manhã</p>
                              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                                <input
                                  type="time"
                                  value={jornada[dia].e1}
                                  onChange={(e) => updateJornada(dia, 'e1', e.target.value)}
                                  className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-1"
                                />
                                <span className="text-slate-600">-</span>
                                <input
                                  type="time"
                                  value={jornada[dia].s1}
                                  onChange={(e) => updateJornada(dia, 's1', e.target.value)}
                                  className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-500 font-bold uppercase text-center">Tarde</p>
                              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                                <input
                                  type="time"
                                  value={jornada[dia].e2}
                                  onChange={(e) => updateJornada(dia, 'e2', e.target.value)}
                                  className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-1"
                                />
                                <span className="text-slate-600">-</span>
                                <input
                                  type="time"
                                  value={jornada[dia].s2}
                                  onChange={(e) => updateJornada(dia, 's2', e.target.value)}
                                  className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-1"
                                />
                              </div>
                            </div>
                          </div>

                          {diaErros.length > 0 && (
                            <div className="text-[10px] text-yellow-200 bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-2">
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
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <MapPin size={16} /> Validação de Ponto
              </h3>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <label className="text-xs font-bold text-slate-400 mb-3 block">Modo de Validação</label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModoValidacao('GPS')}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all w-full ${
                      modoValidacao === 'GPS'
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <MapPin size={20} />
                    <span className="text-xs font-bold">GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoValidacao('PC_IP')}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all w-full ${
                      modoValidacao === 'PC_IP'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Monitor size={20} />
                    <span className="text-xs font-bold">IP (Wifi/Cabo)</span>
                  </button>
                </div>
              </div>


              {modoValidacao === 'GPS' && (
                <div className="space-y-4 animate-in fade-in">
                  <label className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 cursor-pointer">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        pontoLivre ? 'bg-purple-600 border-purple-600' : 'border-slate-500'
                      }`}
                    >
                      {pontoLivre && <User size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={pontoLivre}
                      onChange={(e) => setPontoLivre(e.target.checked)}
                      className="hidden"
                    />
                    <div>
                      <span className="font-bold block text-sm text-white">Trabalho Externo (Livre)</span>
                      <span className="text-xs text-slate-400">Pode bater ponto em qualquer lugar.</span>
                    </div>
                  </label>

                  {!pontoLivre && (
                    <div className="space-y-4">
                      {/* Sede Principal */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-purple-400 uppercase">Sede Principal</span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setModoMapaExtra('NONE');
                                setMostrarMapaPrincipal((v) => !v);
                              }}
                              className="text-xs bg-slate-800 text-slate-200 px-2 py-1 rounded flex items-center gap-1 border border-slate-700"
                            >
                              <MapPin size={12} /> {mostrarMapaPrincipal ? 'Ocultar mapa' : 'Editar no mapa'}
                            </button>

                            <button
                              type="button"
                              onClick={() => pegarLocalizacaoAtual('PRINCIPAL')}
                              className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded flex items-center gap-1"
                            >
                              <MapPin size={12} /> Pegar GPS
                            </button>
                          </div>
                        </div>

                        {/* Endereço referência */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">
                            Endereço / Referência (opcional)
                          </label>
                          <input
                            placeholder="Ex: Av. Brasil, 123 - Centro"
                            value={enderecoPrincipal}
                            onChange={(e) => setEnderecoPrincipal(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Endereço conferido */}
                        {!!enderecoConferidoPrincipal && (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Endereço conferido</p>
                            <p className="text-xs text-slate-200 mt-1">{enderecoConferidoPrincipal}</p>
                          </div>
                        )}

                        {/* Inputs Lat/Lng/Raio */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            placeholder="Lat"
                            value={lat}
                            onChange={(e) => setLat(e.target.value)}
                            className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white"
                          />
                          <input
                            placeholder="Lng"
                            value={lng}
                            onChange={(e) => setLng(e.target.value)}
                            className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white"
                          />
                          <div className="relative">
                            <input
                              type="number"
                              value={raio}
                              onChange={(e) => setRaio(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white pl-12"
                            />
                            <span className="absolute left-3 top-3 text-xs text-slate-500">Raio:</span>
                          </div>
                        </div>

                        {/* Mapa colapsável */}
                        {mostrarMapaPrincipal && (
                          <div className="pt-2">
                            <MapaCaptura latInicial={lat} lngInicial={lng} aoSelecionar={aoClicarNoMapa} />
                            <p className="text-[10px] text-slate-500 mt-2">
                              Use CEP + número para máxima precisão, e ajuste clicando no mapa se necessário.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Locais Extras */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase">Locais Extras</p>

                        {locaisExtras.map((loc, idx) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-700 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white">{loc.nome}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModoMapaExtra(idx);
                                    setMostrarMapaPrincipal(false);
                                  }}
                                  className="text-xs bg-slate-800 text-blue-300 px-2 py-1 rounded border border-slate-700"
                                >
                                  Editar no mapa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLocalExtra(idx)}
                                  className="text-red-400 p-1"
                                  title="Remover local"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {!!enderecosConferidosExtras[idx] && (
                              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Endereço conferido</p>
                                <p className="text-xs text-slate-200 mt-1">{enderecosConferidosExtras[idx]}</p>
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
                                className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                              />
                              <input
                                placeholder="Lng"
                                value={loc.lng || ''}
                                onChange={(e) => {
                                  const nova = [...locaisExtras];
                                  nova[idx] = { ...nova[idx], lng: e.target.value };
                                  setLocaisExtras(nova);
                                }}
                                className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
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
                                className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Novo Local Extra */}
                        <div className="mt-3 p-3 rounded-lg border border-slate-700 bg-slate-950 space-y-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Adicionar novo local</p>

                          <input
                            placeholder="Nome do Local (Ex: Filial Centro)"
                            value={novoLocal.nome}
                            onChange={(e) => setNovoLocal({ ...novoLocal, nome: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                          />

                          <input
                            placeholder="Endereço / Referência (opcional)"
                            value={novoLocalEndereco}
                            onChange={(e) => setNovoLocalEndereco(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                          />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              placeholder="Lat"
                              value={novoLocal.lat}
                              onChange={(e) => setNovoLocal({ ...novoLocal, lat: e.target.value })}
                              className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                            />
                            <input
                              placeholder="Lng"
                              value={novoLocal.lng}
                              onChange={(e) => setNovoLocal({ ...novoLocal, lng: e.target.value })}
                              className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                            />
                            <input
                              placeholder="Raio (m)"
                              type="number"
                              value={novoLocal.raio}
                              onChange={(e) => setNovoLocal({ ...novoLocal, raio: e.target.value })}
                              className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => pegarLocalizacaoAtual('EXTRA')}
                              className="flex-1 bg-slate-800 text-blue-400 p-2.5 rounded-lg border border-slate-700 text-xs font-bold flex items-center justify-center gap-2"
                            >
                              <MapPin size={16} /> Pegar GPS
                            </button>

                            <button
                              type="button"
                              onClick={() => setModoMapaExtra('NOVO')}
                              className="flex-1 bg-slate-800 text-purple-300 p-2.5 rounded-lg border border-slate-700 text-xs font-bold"
                            >
                              Selecionar no mapa
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!novoLocal.nome || !novoLocal.lat || !novoLocal.lng)
                                  return alert('Defina nome e localização (lat/lng).');

                                setLocaisExtras([
                                  ...locaisExtras,
                                  { ...novoLocal, endereco: novoLocalEndereco },
                                ]);

                                setNovoLocal({ nome: '', lat: '', lng: '', raio: '100' });
                                setNovoLocalEndereco('');
                                setModoMapaExtra('NONE');
                              }}
                              className="bg-slate-800 text-green-400 p-2.5 rounded-lg border border-slate-700 font-bold text-xs"
                            >
                              ADD
                            </button>
                          </div>

                          {/* Mapa apenas para selecionar o NOVO local extra */}
                          {modoMapaExtra === 'NOVO' && (
                            <div className="pt-2">
                              <MapaCaptura
                                latInicial={novoLocal.lat}
                                lngInicial={novoLocal.lng}
                                aoSelecionar={aoClicarNoMapa}
                              />
                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setModoMapaExtra('NONE')}
                                  className="text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700"
                                >
                                  Fechar mapa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mapa para editar um Extra existente */}
                        {typeof modoMapaExtra === 'number' && (
                          <div className="pt-2">
                            <MapaCaptura
                              latInicial={String(locaisExtras[modoMapaExtra]?.lat || '')}
                              lngInicial={String(locaisExtras[modoMapaExtra]?.lng || '')}
                              aoSelecionar={aoClicarNoMapa}
                            />
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setModoMapaExtra('NONE')}
                                className="text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700"
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
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3 bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/30">
                    <Monitor className="text-emerald-400" size={20} />
                    <div>
                      <p className="text-sm font-bold text-emerald-100">Controle por IP</p>
                      <p className="text-[10px] text-emerald-300/70">
                        O funcionário só poderá bater ponto conectado nestas redes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">IPs Permitidos</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="Ex: 191.23.45.67"
                        value={ipsPermitidos}
                        onChange={(e) => setIpsPermitidos(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={capturarIpAtual}
                        disabled={capturandoIp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-lg font-bold text-xs flex items-center gap-2"
                      >
                        {capturandoIp ? <RefreshCw className="animate-spin" size={16} /> : <Globe size={16} />}{' '}
                        Capturar
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                      <Network size={10} /> Use IPs fixos ou públicos.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 4. FOTO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <Upload size={16} /> Biometria (Foto)
              </h3>

              <div
                className={`bg-slate-900 p-6 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-center gap-3 transition-colors ${
                  dragOver ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
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
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                    <ImageIcon size={28} className="text-slate-500" />
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="foto-upload"
                    className="block text-purple-400 font-bold text-sm cursor-pointer hover:underline"
                  >
                    {funcionarioEdicao ? 'Alterar Foto Atual' : 'Enviar Foto'}
                  </label>
                  <p className="text-[10px] text-slate-500">
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
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 md:rounded-b-2xl sticky bottom-0 z-10 flex-shrink-0">
          <button
            onClick={salvar}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
              funcionarioEdicao ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
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

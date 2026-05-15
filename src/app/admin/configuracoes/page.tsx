'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Save, Camera, Lock, UserCog, EyeOff,
  Settings, ShieldAlert, Users, MapPin, ChevronRight, ChevronDown,
  Building2, Bell, Timer, TrendingUp, Coffee,
  SmartphoneNfc, Plus, X, Search, Loader2, Palette, Upload, Image as ImageIcon, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type ConfigsState = {
  bloquearForaDoRaio: boolean;
  exigirFoto: boolean;
  permitirEdicaoFunc: boolean;
  ocultarSaldoHoras: boolean;
  ocultar_menu_atestados: boolean;
  lembretesAtivos: boolean;
  toleranciaMinutos: number;
  limiteDiarioHoraExtraMin: number;
  duracaoPausaCafeMin: number;
  permiteIntervaloCafe: boolean;
  cafeDepoisDoAlmoco: boolean;
  bloquearPontoApp: boolean;
  autoAprovarAjusteMinutos: number;
  resumoDiarioAtivo: boolean;
  resumoDiarioHora: number;
  resumoDiarioCanal: 'push' | 'email' | 'ambos';
  naoPerturbarAtivo: boolean;
  naoPerturbarInicio: number;
  naoPerturbarFim: number;
  // Banco de horas
  saldoMaximoHoras: number; // 0 = sem limite
  vencimentoSaldoBanco: 'nunca' | 'mensal' | 'semestral' | 'anual';
  // Fechamento automático mensal
  fechamentoAutomatico: boolean;
  fechamentoDiaMes: number; // 1-28
  // Férias coletivas
  feriasColetivasAtiva: boolean;
  feriasColetivasInicio: string; // YYYY-MM-DD
  feriasColetivasFim: string;
  // Whitelist de IPs pro ponto fixo
  ipWhitelistAtiva: boolean;
  ipWhitelist: string; // IPs separados por linha
};

type EmpresaState = {
  nome: string;
  cnpj: string;
  cobrancaWhatsapp: string;
};

type BrandingState = {
  nomeExibicao: string;
  logoUrl: string | null;
  corPrimaria: string;
};

const DEFAULTS: ConfigsState = {
  bloquearForaDoRaio: true,
  exigirFoto: true,
  permitirEdicaoFunc: false,
  ocultarSaldoHoras: false,
  ocultar_menu_atestados: false,
  lembretesAtivos: true,
  toleranciaMinutos: 10,
  limiteDiarioHoraExtraMin: 120,
  duracaoPausaCafeMin: 15,
  permiteIntervaloCafe: false,
  cafeDepoisDoAlmoco: false,
  bloquearPontoApp: false,
  autoAprovarAjusteMinutos: 0,
  resumoDiarioAtivo: false,
  resumoDiarioHora: 8,
  resumoDiarioCanal: 'ambos',
  naoPerturbarAtivo: false,
  naoPerturbarInicio: 18,
  naoPerturbarFim: 8,
  saldoMaximoHoras: 0,
  vencimentoSaldoBanco: 'nunca',
  fechamentoAutomatico: false,
  fechamentoDiaMes: 1,
  feriasColetivasAtiva: false,
  feriasColetivasInicio: '',
  feriasColetivasFim: '',
  ipWhitelistAtiva: false,
  ipWhitelist: '',
};

const BRANDING_DEFAULT: BrandingState = {
  nomeExibicao: '',
  logoUrl: null,
  corPrimaria: '#7c3aed',
};

type AbaId =
  | 'identidade'
  | 'empresa'
  | 'seguranca'
  | 'regras'
  | 'banco_horas'
  | 'totem'
  | 'notificacoes'
  | 'funcionario'
  | 'aparencia'
  | 'relacionadas';

const ABAS: { id: AbaId; label: string; icon: any; cor: string }[] = [
  { id: 'identidade',   label: 'Identidade',     icon: Palette,      cor: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30' },
  { id: 'empresa',      label: 'Empresa',        icon: Building2,    cor: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  { id: 'seguranca',    label: 'Segurança',      icon: Lock,         cor: 'text-red-300 bg-red-500/15 border-red-500/30' },
  { id: 'regras',       label: 'Regras',         icon: Timer,        cor: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  { id: 'banco_horas',  label: 'Banco de Horas', icon: TrendingUp,   cor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'totem',        label: 'Modo Totem',     icon: SmartphoneNfc, cor: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { id: 'notificacoes', label: 'Notificações',   icon: Bell,         cor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'funcionario',  label: 'Funcionário',    icon: Users,        cor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' },
  { id: 'aparencia',    label: 'Aparência',      icon: EyeOff,       cor: 'text-slate-300 bg-slate-500/15 border-slate-500/30' },
  { id: 'relacionadas', label: 'Em outras telas', icon: ChevronRight, cor: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' },
];

function Toggle({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 ${ativo ? 'bg-purple-600' : 'bg-border-input'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${ativo ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ItemToggle({
  icon, titulo, descricao, ativo, onToggle, accent = 'purple',
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  ativo: boolean;
  onToggle: () => void;
  accent?: 'purple' | 'red' | 'blue' | 'emerald' | 'amber';
}) {
  const accentBg: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-400',
    red: 'bg-red-500/15 text-red-400',
    blue: 'bg-blue-500/15 text-blue-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };
  return (
    <div className="flex items-start gap-4 p-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${ativo ? accentBg[accent] : 'bg-elevated-solid text-text-faint'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-text-primary">{titulo}</h3>
        <p className="text-xs text-text-muted mt-0.5">{descricao}</p>
      </div>
      <Toggle ativo={ativo} onClick={onToggle} />
    </div>
  );
}

function ItemNumero({
  icon, titulo, descricao, valor, onChange, min = 0, max = 999, sufixo = 'min', accent = 'purple',
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  sufixo?: string;
  accent?: 'purple' | 'blue' | 'amber';
}) {
  const accentBg: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };
  return (
    <div className="flex items-start gap-4 p-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${accentBg[accent]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-text-primary">{titulo}</h3>
        <p className="text-xs text-text-muted mt-0.5">{descricao}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          value={valor}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
          className="w-20 bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary text-center focus:border-purple-500 outline-none"
        />
        <span className="text-xs text-text-dim">{sufixo}</span>
      </div>
    </div>
  );
}

function ItemTexto({
  label, valor, onChange, placeholder,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="p-4 space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">{label}</label>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-purple-500 outline-none"
      />
    </div>
  );
}

function Card({ titulo, descricao, children }: { titulo?: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div>
      {titulo && (
        <div className="mb-2 px-1">
          <h2 className="text-[11px] uppercase font-bold text-text-dim tracking-wider">{titulo}</h2>
          {descricao && <p className="text-[11px] text-text-faint mt-0.5">{descricao}</p>}
        </div>
      )}
      <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle divide-y divide-border-subtle">
        {children}
      </div>
    </div>
  );
}

type CafeOverride = { id: string; nome: string; cafeOrdem: 'ANTES' | 'DEPOIS' };
type FuncionarioMin = { id: string; nome: string };

function CafeOverridesManager({ cafeDepoisDoAlmoco }: { cafeDepoisDoAlmoco: boolean }) {
  const [overrides, setOverrides] = useState<CafeOverride[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [busca, setBusca] = useState('');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [resOv, resFun] = await Promise.all([
        axios.get('/api/admin/totem/cafe-overrides'),
        axios.get('/api/admin/funcionarios'),
      ]);
      setOverrides(resOv.data || []);
      setFuncionarios((resFun.data || []).map((f: any) => ({ id: f.id, nome: f.nome })));
    } catch {
      toast.error('Erro ao carregar configurações de café.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const setOverride = async (funcionarioId: string, cafeOrdem: 'ANTES' | 'DEPOIS' | null) => {
    setSalvandoId(funcionarioId);
    try {
      await axios.put('/api/admin/totem/cafe-overrides', { funcionarioId, cafeOrdem });
      await carregar();
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvandoId(null);
    }
  };

  const ordemPadrao = cafeDepoisDoAlmoco ? 'DEPOIS' : 'ANTES';
  const ordemContraria = cafeDepoisDoAlmoco ? 'ANTES' : 'DEPOIS';

  const idsComOverride = new Set(overrides.map(o => o.id));
  const disponiveisFiltrados = funcionarios
    .filter(f => !idsComOverride.has(f.id))
    .filter(f => f.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div className="p-4 space-y-3">
      <div>
        <p className="text-xs text-text-muted">
          Padrão da empresa: <span className="font-semibold text-text-primary">café {ordemPadrao === 'DEPOIS' ? 'depois' : 'antes'} do almoço</span>.
          Quem está aqui faz o contrário (configurado individualmente).
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-xs"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
      ) : overrides.length === 0 ? (
        <p className="text-xs text-text-faint italic">Nenhum funcionário com configuração diferente do padrão.</p>
      ) : (
        <div className="space-y-2">
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between gap-3 p-2.5 bg-page/40 border border-border-subtle rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{o.nome}</div>
                <div className="text-[11px] text-text-muted">
                  café <span className="font-semibold text-purple-300">{o.cafeOrdem === 'DEPOIS' ? 'depois' : 'antes'}</span> do almoço
                </div>
              </div>
              <button
                onClick={() => setOverride(o.id, null)}
                disabled={salvandoId === o.id}
                className="text-text-faint hover:text-rose-400 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                title="Voltar ao padrão da empresa"
              >
                {salvandoId === o.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {!adicionando ? (
        <button
          onClick={() => { setAdicionando(true); setBusca(''); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 transition-colors"
        >
          <Plus size={14} /> Adicionar funcionário
        </button>
      ) : (
        <div className="space-y-2 p-3 bg-page/40 border border-border-subtle rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-muted">
              Adicionar funcionário que faz café <span className="font-semibold">{ordemContraria === 'DEPOIS' ? 'depois' : 'antes'}</span> do almoço:
            </p>
            <button onClick={() => setAdicionando(false)} className="text-text-faint hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-8 pr-3 py-2 bg-page border border-border-input rounded-lg text-sm text-text-primary placeholder:text-text-faint outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          {disponiveisFiltrados.length === 0 ? (
            <p className="text-xs text-text-faint italic">
              {busca ? 'Nenhum funcionário encontrado.' : 'Todos os funcionários já estão configurados.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {disponiveisFiltrados.slice(0, 20).map(f => (
                <button
                  key={f.id}
                  onClick={() => { setOverride(f.id, ordemContraria as 'ANTES' | 'DEPOIS'); setAdicionando(false); }}
                  disabled={salvandoId === f.id}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary bg-elevated hover:bg-elevated-solid rounded-lg transition-colors disabled:opacity-50"
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IdentidadeCard({
  branding,
  onChange,
  empresaNome,
}: {
  branding: BrandingState;
  onChange: (b: BrandingState) => void;
  empresaNome: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [salvandoBranding, setSalvandoBranding] = useState(false);
  const [removendoLogo, setRemovendoLogo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef<BrandingState>(branding);

  useEffect(() => {
    initialRef.current = branding;
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marcarDirty = (next: BrandingState) => {
    onChange(next);
    setDirty(next.nomeExibicao !== initialRef.current.nomeExibicao);
  };

  const escolherArquivo = () => fileInputRef.current?.click();

  const fazerUploadLogo = async (file: File) => {
    setEnviandoLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const r = await axios.post('/api/admin/empresa/branding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const novo = { ...branding, logoUrl: r.data.logoUrl };
      onChange(novo);
      initialRef.current = { ...initialRef.current, logoUrl: r.data.logoUrl };
      toast.success('Logo atualizada!');
    } catch (err: any) {
      toast.error(err?.response?.data?.erro || 'Falha ao enviar logo.');
    } finally {
      setEnviandoLogo(false);
    }
  };

  const removerLogo = async () => {
    if (!confirm('Remover a logo da empresa?')) return;
    setRemovendoLogo(true);
    try {
      await axios.delete('/api/admin/empresa/branding');
      const novo = { ...branding, logoUrl: null };
      onChange(novo);
      initialRef.current = { ...initialRef.current, logoUrl: null };
      toast.success('Logo removida.');
    } catch {
      toast.error('Erro ao remover logo.');
    } finally {
      setRemovendoLogo(false);
    }
  };

  const salvarBranding = async () => {
    setSalvandoBranding(true);
    try {
      const fd = new FormData();
      fd.append('nomeExibicao', branding.nomeExibicao);
      const r = await axios.post('/api/admin/empresa/branding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      initialRef.current = {
        nomeExibicao: r.data.nomeExibicao || '',
        logoUrl: r.data.logoUrl,
        corPrimaria: r.data.corPrimaria || '#7c3aed',
      };
      setDirty(false);
      toast.success('Identidade salva!');
    } catch (err: any) {
      toast.error(err?.response?.data?.erro || 'Erro ao salvar identidade.');
    } finally {
      setSalvandoBranding(false);
    }
  };

  const nomePreview = branding.nomeExibicao?.trim() || empresaNome || 'Empresa';

  return (
    <div className="space-y-4">
      <Card titulo="Identidade visual" descricao="Logo, nome e cor que aparecem na sidebar/header do painel.">
        {/* Preview */}
        <div className="p-4 flex items-center gap-4 bg-page/40">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: branding.corPrimaria + '20',
              borderColor: branding.corPrimaria + '40',
            }}
          >
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl" />
            ) : (
              <ImageIcon size={22} style={{ color: branding.corPrimaria }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{nomePreview}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-dim">Pré-visualização do painel</div>
          </div>
        </div>

        {/* Upload logo */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Logo</p>
            <p className="text-[11px] text-text-faint mt-0.5">PNG, JPG, WEBP ou SVG. Máx. 2MB. Quadrada de preferência.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fazerUploadLogo(f);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={escolherArquivo}
              disabled={enviandoLogo}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {enviandoLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {branding.logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {branding.logoUrl && (
              <button
                onClick={removerLogo}
                disabled={removendoLogo}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-elevated hover:bg-elevated-solid text-text-secondary text-sm transition-colors disabled:opacity-60"
              >
                {removendoLogo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remover
              </button>
            )}
          </div>
        </div>

        {/* Nome de exibição */}
        <ItemTexto
          label="Nome de exibição (opcional)"
          valor={branding.nomeExibicao}
          onChange={(v) => marcarDirty({ ...branding, nomeExibicao: v })}
          placeholder={empresaNome || 'Como sua marca aparece no painel'}
        />

        {dirty && (
          <div className="p-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                onChange(initialRef.current);
                setDirty(false);
              }}
              className="px-3 py-2 rounded-xl text-text-muted hover:text-text-primary text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarBranding}
              disabled={salvandoBranding}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {salvandoBranding ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar identidade
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ConfiguracoesEmpresa() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [configs, setConfigs] = useState<ConfigsState>(DEFAULTS);
  const [empresa, setEmpresa] = useState<EmpresaState>({ nome: '', cnpj: '', cobrancaWhatsapp: '' });
  const [branding, setBranding] = useState<BrandingState>(BRANDING_DEFAULT);
  const [temAddonTotem, setTemAddonTotem] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('identidade');
  const [mobileAbaOpen, setMobileAbaOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/empresa').then(r => r.data),
      axios.get('/api/admin/empresa/branding').then(r => r.data).catch(() => null),
    ])
      .then(([empData, brData]) => {
        if (empData?.configuracoes) setConfigs({ ...DEFAULTS, ...empData.configuracoes });
        setEmpresa({
          nome: empData?.nome || '',
          cnpj: empData?.cnpj || '',
          cobrancaWhatsapp: empData?.cobrancaWhatsapp || '',
        });
        setTemAddonTotem(empData?.addonTotemEfetivo === true);
        if (brData) {
          setBranding({
            nomeExibicao: brData.nomeExibicao || '',
            logoUrl: brData.logoUrl || null,
            corPrimaria: brData.corPrimaria || '#7c3aed',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (campo: keyof ConfigsState) => {
    setConfigs(prev => ({ ...prev, [campo]: !prev[campo] }));
  };

  const setNum = (campo: keyof ConfigsState) => (v: number) => {
    setConfigs(prev => ({ ...prev, [campo]: v }));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await axios.put('/api/admin/empresa', { ...configs, ...empresa });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const abasVisiveis = useMemo(() => ABAS.filter(a => a.id !== 'totem' || temAddonTotem), [temAddonTotem]);
  const abaAtual = abasVisiveis.find(a => a.id === abaAtiva) || abasVisiveis[0];

  if (loading) return (
    <div className="min-h-screen bg-page text-text-primary" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="h-10 w-64 bg-hover-bg rounded-xl animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-hover-bg rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  // Save button só aparece em abas que mexem em configs/empresa (não em identidade ou relacionadas).
  const mostraSaveGlobal = abaAtiva !== 'identidade' && abaAtiva !== 'relacionadas';

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div className="bg-purple-500/15 p-2 rounded-xl border border-purple-500/20">
            <Settings size={20} className="text-purple-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Configurações</h1>
            <p className="text-text-muted text-[11px]">Comportamento do sistema para sua equipe.</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
          {/* Sidebar de abas (desktop) */}
          <aside className="hidden lg:block">
            <nav className="space-y-1 sticky top-24">
              {abasVisiveis.map(a => {
                const Icon = a.icon;
                const ativa = a.id === abaAtiva;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAbaAtiva(a.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                      ativa
                        ? 'bg-purple-500/15 border border-purple-500/30 text-text-primary font-medium'
                        : 'border border-transparent text-text-secondary hover:bg-hover-bg hover:text-text-primary'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${a.cor}`}>
                      <Icon size={13} />
                    </span>
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Dropdown de abas (mobile) */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setMobileAbaOpen(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border-subtle bg-surface text-sm font-medium text-text-primary"
            >
              <span className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${abaAtual.cor}`}>
                  <abaAtual.icon size={13} />
                </span>
                {abaAtual.label}
              </span>
              <ChevronDown size={14} className={`transition-transform ${mobileAbaOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileAbaOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden">
                {abasVisiveis.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setAbaAtiva(a.id); setMobileAbaOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                        a.id === abaAtiva ? 'bg-purple-500/15 text-text-primary' : 'text-text-secondary hover:bg-hover-bg'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${a.cor}`}>
                        <Icon size={13} />
                      </span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conteúdo da aba */}
          <section className="space-y-6 min-w-0">
            {abaAtiva === 'identidade' && (
              <IdentidadeCard
                branding={branding}
                onChange={setBranding}
                empresaNome={empresa.nome}
              />
            )}

            {abaAtiva === 'empresa' && (
              <Card titulo="Dados da empresa" descricao="Identificação, CNPJ e canal de cobrança.">
                <div className="flex items-start gap-4 p-4 border-b border-border-subtle">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Identificação</h3>
                    <p className="text-xs text-text-muted mt-0.5">Nome, CNPJ e WhatsApp de cobrança.</p>
                  </div>
                </div>
                <ItemTexto label="Nome da empresa" valor={empresa.nome} onChange={v => setEmpresa(p => ({ ...p, nome: v }))} placeholder="Ex: Studio Kadosh" />
                <ItemTexto label="CNPJ" valor={empresa.cnpj} onChange={v => setEmpresa(p => ({ ...p, cnpj: v }))} placeholder="00.000.000/0000-00" />
                <ItemTexto label="WhatsApp (cobrança)" valor={empresa.cobrancaWhatsapp} onChange={v => setEmpresa(p => ({ ...p, cobrancaWhatsapp: v }))} placeholder="+55 11 99999-9999" />
              </Card>
            )}

            {abaAtiva === 'seguranca' && (
              <div className="space-y-6">
                <Card titulo="Segurança do ponto" descricao="Como o sistema valida cada batida.">
                  <ItemToggle
                    icon={<Lock size={18} />}
                    titulo="Bloqueio rigoroso de GPS"
                    descricao={configs.bloquearForaDoRaio
                      ? 'Funcionário não consegue bater ponto fora do raio.'
                      : 'Permite bater fora do raio, marca como "Fora do Local".'}
                    ativo={configs.bloquearForaDoRaio}
                    onToggle={() => toggle('bloquearForaDoRaio')}
                    accent="red"
                  />
                  <ItemToggle
                    icon={<Camera size={18} />}
                    titulo="Exigir foto no ponto"
                    descricao={configs.exigirFoto
                      ? 'Obrigatório tirar selfie para registrar.'
                      : 'Apenas GPS. Botão de foto oculto.'}
                    ativo={configs.exigirFoto}
                    onToggle={() => toggle('exigirFoto')}
                    accent="blue"
                  />
                </Card>

                <Card titulo="Whitelist de IPs" descricao="Restringe batida de ponto a IPs específicos (ex.: rede do escritório).">
                  <ItemToggle
                    icon={<Lock size={18} />}
                    titulo="Ativar whitelist de IPs"
                    descricao="Quando ligado, só permite bater ponto se o IP do funcionário estiver na lista abaixo."
                    ativo={configs.ipWhitelistAtiva}
                    onToggle={() => toggle('ipWhitelistAtiva')}
                    accent="red"
                  />
                  {configs.ipWhitelistAtiva && (
                    <div className="p-4 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">IPs liberados</label>
                      <p className="text-[11px] text-text-faint">Um IP por linha. Suporta IPv4 ou IPv6. Ex.: <span className="font-mono">200.180.10.5</span></p>
                      <textarea
                        value={configs.ipWhitelist}
                        onChange={(e) => setConfigs(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                        placeholder="200.180.10.5&#10;200.180.10.6"
                        rows={4}
                        className="w-full bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-purple-500 outline-none font-mono"
                      />
                    </div>
                  )}
                </Card>
              </div>
            )}

            {abaAtiva === 'regras' && (
              <Card titulo="Regras de cálculo" descricao="Tolerâncias e limites usados no fechamento.">
                <ItemNumero
                  icon={<Timer size={18} />}
                  titulo="Tolerância de atraso/saldo"
                  descricao="Minutos ignorados no saldo e em atrasos (diferenças pequenas não contam)."
                  valor={configs.toleranciaMinutos}
                  onChange={setNum('toleranciaMinutos')}
                  min={0}
                  max={60}
                />
                <ItemNumero
                  icon={<TrendingUp size={18} />}
                  titulo="Limite diário de hora extra"
                  descricao="Máximo de minutos extras contados por dia. 0 = sem limite."
                  valor={configs.limiteDiarioHoraExtraMin}
                  onChange={setNum('limiteDiarioHoraExtraMin')}
                  min={0}
                  max={600}
                  accent="amber"
                />
                <ItemNumero
                  icon={<Coffee size={18} />}
                  titulo="Duração da pausa café"
                  descricao="Após esse tempo, o funcionário recebe alerta de pausa excedida."
                  valor={configs.duracaoPausaCafeMin}
                  onChange={setNum('duracaoPausaCafeMin')}
                  min={5}
                  max={60}
                  accent="blue"
                />
                <ItemNumero
                  icon={<TrendingUp size={18} />}
                  titulo="Auto-aprovar ajustes pequenos"
                  descricao="Ajustes do funcionário até este limite (em minutos) são aplicados na hora, sem passar pela fila. Aprovado fica auditável no histórico. 0 = sempre exige aprovação."
                  valor={configs.autoAprovarAjusteMinutos}
                  onChange={setNum('autoAprovarAjusteMinutos')}
                  min={0}
                  max={30}
                  accent="amber"
                />
              </Card>
            )}

            {abaAtiva === 'banco_horas' && (
              <div className="space-y-6">
                <Card titulo="Política de banco de horas" descricao="Limites e ciclo de saldo. Aplicado no cálculo de fechamento.">
                  <ItemNumero
                    icon={<TrendingUp size={18} />}
                    titulo="Saldo máximo permitido"
                    descricao="Limite em horas que pode ser acumulado. 0 = sem limite. (Aplicado no cálculo do fechamento.)"
                    valor={configs.saldoMaximoHoras}
                    onChange={setNum('saldoMaximoHoras')}
                    min={0}
                    max={500}
                    sufixo="h"
                    accent="amber"
                  />
                  <div className="flex items-start gap-4 p-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
                      <Timer size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-text-primary">Vencimento do saldo</h3>
                      <p className="text-xs text-text-muted mt-0.5">A cada quanto tempo o saldo zera (encerrado automaticamente).</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={configs.vencimentoSaldoBanco}
                        onChange={(e) => setConfigs(prev => ({ ...prev, vencimentoSaldoBanco: e.target.value as ConfigsState['vencimentoSaldoBanco'] }))}
                        className="bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                      >
                        <option value="nunca">Nunca</option>
                        <option value="mensal">A cada mês</option>
                        <option value="semestral">A cada 6 meses</option>
                        <option value="anual">A cada ano</option>
                      </select>
                    </div>
                  </div>
                </Card>

                <Card titulo="Fechamento mensal automático" descricao="O sistema gera o fechamento de todos os funcionários todo mês — você só precisa acompanhar e assinar.">
                  <ItemToggle
                    icon={<Bell size={18} />}
                    titulo="Gerar fechamento automaticamente"
                    descricao="Quando ligado, no dia configurado o sistema cria o fechamento do mês anterior pra cada funcionário e dispara push pra eles assinarem."
                    ativo={configs.fechamentoAutomatico}
                    onToggle={() => toggle('fechamentoAutomatico')}
                    accent="emerald"
                  />
                  {configs.fechamentoAutomatico && (
                    <ItemNumero
                      icon={<Timer size={18} />}
                      titulo="Dia do mês"
                      descricao="Dia em que o fechamento do mês anterior é gerado. Recomendado: 1 ao 5."
                      valor={configs.fechamentoDiaMes}
                      onChange={setNum('fechamentoDiaMes')}
                      min={1}
                      max={28}
                      sufixo=""
                      accent="purple"
                    />
                  )}
                </Card>

                <Card titulo="Férias coletivas" descricao="Período em que ninguém trabalha — cálculo ignora atrasos e não conta hora extra.">
                  <ItemToggle
                    icon={<Bell size={18} />}
                    titulo="Ativar férias coletivas"
                    descricao="Durante o período definido, o sistema trata todos os dias como folga. Útil também pra recesso de fim de ano."
                    ativo={configs.feriasColetivasAtiva}
                    onToggle={() => toggle('feriasColetivasAtiva')}
                    accent="amber"
                  />
                  {configs.feriasColetivasAtiva && (
                    <>
                      <div className="p-4 space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Início</label>
                        <input
                          type="date"
                          value={configs.feriasColetivasInicio}
                          onChange={(e) => setConfigs(prev => ({ ...prev, feriasColetivasInicio: e.target.value }))}
                          className="w-full bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="p-4 space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Fim</label>
                        <input
                          type="date"
                          value={configs.feriasColetivasFim}
                          onChange={(e) => setConfigs(prev => ({ ...prev, feriasColetivasFim: e.target.value }))}
                          className="w-full bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-purple-500 outline-none"
                        />
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}

            {abaAtiva === 'totem' && temAddonTotem && (
              <Card titulo="Modo Totem" descricao="Comportamento específico do tablet de batida.">
                <ItemToggle
                  icon={<Coffee size={18} />}
                  titulo="Registrar intervalo de café no totem"
                  descricao="Quando ligado, o totem espera 6 batidas no dia em vez de 4."
                  ativo={configs.permiteIntervaloCafe}
                  onToggle={() => toggle('permiteIntervaloCafe')}
                  accent="blue"
                />
                {configs.permiteIntervaloCafe && (
                  <>
                    <ItemToggle
                      icon={<Timer size={18} />}
                      titulo="Café é depois do almoço"
                      descricao={
                        configs.cafeDepoisDoAlmoco
                          ? "Sequência: Entrada → Almoço → Volta → Café → Volta → Saída."
                          : "Sequência: Entrada → Café → Volta → Almoço → Volta → Saída. Ligue se na sua empresa o café é à tarde."
                      }
                      ativo={configs.cafeDepoisDoAlmoco}
                      onToggle={() => toggle('cafeDepoisDoAlmoco')}
                      accent="blue"
                    />
                    <CafeOverridesManager cafeDepoisDoAlmoco={configs.cafeDepoisDoAlmoco} />
                  </>
                )}
                <ItemToggle
                  icon={<SmartphoneNfc size={18} />}
                  titulo="Funcionários só batem ponto pelo totem"
                  descricao="Bloqueia o botão de bater ponto no app/celular do funcionário."
                  ativo={configs.bloquearPontoApp}
                  onToggle={() => toggle('bloquearPontoApp')}
                  accent="amber"
                />
              </Card>
            )}

            {abaAtiva === 'notificacoes' && (
              <div className="space-y-6">
                <Card titulo="Lembretes para funcionários" descricao="Alertas de ponto pra equipe.">
                  <ItemToggle
                    icon={<Bell size={18} />}
                    titulo="Enviar lembretes de ponto"
                    descricao="Notificações push para entrada, almoço, saída, esqueceu de bater, etc."
                    ativo={configs.lembretesAtivos}
                    onToggle={() => toggle('lembretesAtivos')}
                    accent="purple"
                  />
                </Card>

                <Card titulo="Não perturbar" descricao="Bloqueia notificações push pros admins dentro do horário que você escolher.">
                  <ItemToggle
                    icon={<Bell size={18} />}
                    titulo="Ativar modo não perturbar"
                    descricao="Quando ligado, novas solicitações de funcionários não te notificam por push no horário definido. Elas continuam chegando normalmente na fila."
                    ativo={configs.naoPerturbarAtivo}
                    onToggle={() => toggle('naoPerturbarAtivo')}
                    accent="amber"
                  />
                  {configs.naoPerturbarAtivo && (
                    <div className="flex items-start gap-4 p-4">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                        <Timer size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-text-primary">Janela de silêncio</h3>
                        <p className="text-xs text-text-muted mt-0.5">Sem push entre estes horários (fuso de Brasília). Cruza meia-noite se o início for maior que o fim.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={configs.naoPerturbarInicio}
                          onChange={(e) => setConfigs(prev => ({ ...prev, naoPerturbarInicio: parseInt(e.target.value, 10) }))}
                          className="bg-page border border-border-input rounded-xl px-2 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map(h => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                        <span className="text-text-dim text-xs">→</span>
                        <select
                          value={configs.naoPerturbarFim}
                          onChange={(e) => setConfigs(prev => ({ ...prev, naoPerturbarFim: parseInt(e.target.value, 10) }))}
                          className="bg-page border border-border-input rounded-xl px-2 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map(h => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </Card>

                <Card titulo="Resumo diário pro admin" descricao="Recebe todo dia um aviso com o que está pendente — sem precisar abrir o painel.">
                  <ItemToggle
                    icon={<Bell size={18} />}
                    titulo="Receber resumo diário de pendências"
                    descricao="Atestados e ajustes pendentes do dia. Não envia nada se não houver pendência."
                    ativo={configs.resumoDiarioAtivo}
                    onToggle={() => toggle('resumoDiarioAtivo')}
                    accent="emerald"
                  />
                  {configs.resumoDiarioAtivo && (
                    <>
                      <div className="flex items-start gap-4 p-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                          <Timer size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-text-primary">Horário do envio</h3>
                          <p className="text-xs text-text-muted mt-0.5">Hora do dia em que você quer receber (fuso de Brasília).</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={configs.resumoDiarioHora}
                            onChange={(e) => setConfigs(prev => ({ ...prev, resumoDiarioHora: parseInt(e.target.value, 10) }))}
                            className="bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                          >
                            {Array.from({ length: 17 }, (_, i) => i + 6).map(h => (
                              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
                          <Bell size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-text-primary">Canal</h3>
                          <p className="text-xs text-text-muted mt-0.5">Como o resumo chega até você.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={configs.resumoDiarioCanal}
                            onChange={(e) => setConfigs(prev => ({ ...prev, resumoDiarioCanal: e.target.value as 'push' | 'email' | 'ambos' }))}
                            className="bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                          >
                            <option value="ambos">Push + Email</option>
                            <option value="push">Só push</option>
                            <option value="email">Só email</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}

            {abaAtiva === 'funcionario' && (
              <Card titulo="O que o funcionário pode ver e fazer" descricao="Permissões e visibilidade no app.">
                <ItemToggle
                  icon={<EyeOff size={18} />}
                  titulo="Ocultar saldo do banco de horas"
                  descricao="Funcionário não vê o saldo na tela inicial e histórico."
                  ativo={configs.ocultarSaldoHoras}
                  onToggle={() => toggle('ocultarSaldoHoras')}
                  accent="amber"
                />
                <ItemToggle
                  icon={<UserCog size={18} />}
                  titulo="Permitir auto-gestão de ponto"
                  descricao="Funcionário corrige o próprio ponto. Recomendado: desativado."
                  ativo={configs.permitirEdicaoFunc}
                  onToggle={() => toggle('permitirEdicaoFunc')}
                  accent="emerald"
                />
              </Card>
            )}

            {abaAtiva === 'aparencia' && (
              <Card titulo="Aparência e menus" descricao="Mostra/oculta partes do app.">
                <ItemToggle
                  icon={<ShieldAlert size={18} />}
                  titulo="Ocultar menu de atestados"
                  descricao="Remove o botão de envio de atestados do app do funcionário."
                  ativo={configs.ocultar_menu_atestados}
                  onToggle={() => toggle('ocultar_menu_atestados')}
                  accent="amber"
                />
              </Card>
            )}

            {abaAtiva === 'relacionadas' && (
              <Card titulo="Configurado em outra tela">
                <Link href="/admin/funcionarios" className="flex items-center gap-4 p-4 hover:bg-hover-bg transition-colors">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">Local do ponto (GPS, raio, IP)</h3>
                    <p className="text-xs text-text-muted mt-0.5">Definido individualmente por funcionário.</p>
                  </div>
                  <ChevronRight size={18} className="text-text-dim shrink-0" />
                </Link>
                <Link href="/admin/funcionarios" className="flex items-center gap-4 p-4 hover:bg-hover-bg transition-colors">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">Jornada e fluxo de ponto</h3>
                    <p className="text-xs text-text-muted mt-0.5">Horários e modo estrito/flexível por funcionário.</p>
                  </div>
                  <ChevronRight size={18} className="text-text-dim shrink-0" />
                </Link>
              </Card>
            )}
          </section>
        </div>
      </main>

      {mostraSaveGlobal && (
        <button
          onClick={salvar}
          disabled={salvando}
          className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-auto lg:px-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl shadow-purple-900/40 transition-all active:scale-95 z-20 max-w-2xl mx-auto"
        >
          {salvando ? 'Salvando...' : <><Save size={18} /> Salvar alterações</>}
        </button>
      )}
    </div>
  );
}

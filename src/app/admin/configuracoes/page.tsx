'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Save, Camera, Lock, UserCog, EyeOff,
  Settings, ShieldAlert, Users, MapPin, ChevronRight,
  Building2, Bell, Timer, TrendingUp, Coffee,
  Smartphone,
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
};

type EmpresaState = {
  nome: string;
  cnpj: string;
  cobrancaWhatsapp: string;
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
};

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

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] uppercase font-bold text-text-dim tracking-wider mb-2 px-1">{titulo}</h2>
      <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle divide-y divide-border-subtle">
        {children}
      </div>
    </div>
  );
}

export default function ConfiguracoesEmpresa() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [configs, setConfigs] = useState<ConfigsState>(DEFAULTS);
  const [empresa, setEmpresa] = useState<EmpresaState>({ nome: '', cnpj: '', cobrancaWhatsapp: '' });
  const [temAddonTotem, setTemAddonTotem] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/empresa').then(res => {
      if (res.data.configuracoes) {
        setConfigs({ ...DEFAULTS, ...res.data.configuracoes });
      }
      setEmpresa({
        nome: res.data.nome || '',
        cnpj: res.data.cnpj || '',
        cobrancaWhatsapp: res.data.cobrancaWhatsapp || '',
      });
      // addonTotem efetivo (próprio ou herdado da matriz, calculado no backend)
      setTemAddonTotem(res.data.addonTotemEfetivo === true);
      setLoading(false);
    });
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

  if (loading) return (
    <div className="min-h-screen bg-page text-text-primary" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div className="h-10 w-64 bg-hover-bg rounded-xl animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-hover-bg rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24 space-y-6 relative z-10">

        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="bg-purple-500/15 p-2 rounded-xl border border-purple-500/20">
            <Settings size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Configurações</h1>
            <p className="text-text-muted text-xs">Comportamento do sistema para sua equipe.</p>
          </div>
        </div>

        {/* EMPRESA */}
        <Secao titulo="Dados da empresa">
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
        </Secao>

        {/* SEGURANÇA */}
        <Secao titulo="Segurança do ponto">
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
        </Secao>

        {/* REGRAS */}
        <Secao titulo="Regras de cálculo">
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
        </Secao>

        {/* MODO TOTEM (só aparece se a empresa tem o addon ativo) */}
        {temAddonTotem && (
          <Secao titulo="Modo Totem">
            <ItemToggle
              icon={<Coffee size={18} />}
              titulo="Registrar intervalo de café no totem"
              descricao="Quando ligado, o totem espera 6 batidas no dia (Entrada → Saída Café → Volta Café → Saída Almoço → Volta Almoço → Saída) em vez de 4."
              ativo={configs.permiteIntervaloCafe}
              onToggle={() => toggle('permiteIntervaloCafe')}
              accent="blue"
            />
          </Secao>
        )}

        {/* NOTIFICAÇÕES */}
        <Secao titulo="Notificações">
          <ItemToggle
            icon={<Bell size={18} />}
            titulo="Enviar lembretes de ponto"
            descricao="Notificações push para entrada, almoço, saída, esqueceu de bater, etc."
            ativo={configs.lembretesAtivos}
            onToggle={() => toggle('lembretesAtivos')}
            accent="purple"
          />
        </Secao>

        {/* FUNCIONÁRIO */}
        <Secao titulo="O que o funcionário pode ver e fazer">
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
        </Secao>

        {/* APARÊNCIA */}
        <Secao titulo="Aparência e menus">
          <ItemToggle
            icon={<ShieldAlert size={18} />}
            titulo="Ocultar menu de atestados"
            descricao="Remove o botão de envio de atestados do app do funcionário."
            ativo={configs.ocultar_menu_atestados}
            onToggle={() => toggle('ocultar_menu_atestados')}
            accent="amber"
          />
        </Secao>

        {/* RELACIONADAS */}
        <div>
          <h2 className="text-[11px] uppercase font-bold text-text-dim tracking-wider mb-2 px-1">Configurado em outra tela</h2>
          <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle divide-y divide-border-subtle">
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
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-auto lg:px-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl shadow-purple-900/40 transition-all active:scale-95 z-20 max-w-2xl mx-auto"
        >
          {salvando ? 'Salvando...' : <><Save size={18} /> Salvar alterações</>}
        </button>
      </div>
    </div>
  );
}

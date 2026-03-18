'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Upload, Save, Palette, Type, Image as ImageIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ConfiguracoesBranding() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#7c3aed');
  const [corSecundaria, setCorSecundaria] = useState('#4f46e5');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get('/api/revendedor/branding').then(res => {
      setLogoUrl(res.data.logoUrl);
      setNomeExibicao(res.data.nomeExibicao || '');
      setCorPrimaria(res.data.corPrimaria || '#7c3aed');
      setCorSecundaria(res.data.corSecundaria || '#4f46e5');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo deve ter no maximo 2MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append('nomeExibicao', nomeExibicao);
      formData.append('corPrimaria', corPrimaria);
      formData.append('corSecundaria', corSecundaria);
      if (logoFile) formData.append('logo', logoFile);

      const res = await axios.post('/api/revendedor/branding', formData);
      if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
      setLogoFile(null);
      setLogoPreview(null);
      toast.success('Marca branca atualizada!');
    } catch (e: any) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const logoAtual = logoPreview || logoUrl;

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center text-text-muted gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">

        <div className="flex items-center gap-3">
          <Link href="/revendedor" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
            <Palette size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Marca Branca</h1>
            <p className="text-xs text-text-faint">Personalize o sistema com a sua marca</p>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Logo</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border-default flex items-center justify-center overflow-hidden bg-input-solid/30 shrink-0">
              {logoAtual ? (
                <Image src={logoAtual} alt="Logo" width={80} height={80} className="w-full h-full object-contain" />
              ) : (
                <Upload size={24} className="text-text-dim" />
              )}
            </div>
            <div className="space-y-2 flex-1">
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                <Upload size={14} /> {logoAtual ? 'Trocar Logo' : 'Enviar Logo'}
              </button>
              <p className="text-[10px] text-text-dim">PNG ou JPG, max 2MB</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </div>
          </div>
        </div>

        {/* Nome */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Type size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Nome do Sistema</h3>
          </div>
          <p className="text-xs text-text-faint">Seus clientes verao este nome em vez de &quot;WorkID&quot;</p>
          <input
            type="text"
            value={nomeExibicao}
            onChange={e => setNomeExibicao(e.target.value)}
            placeholder="Ex: PontoMax"
            className="w-full bg-input-solid/50 border border-border-default rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:border-purple-500 transition-all"
          />
        </div>

        {/* Cores */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Cores</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Primaria</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} className="w-10 h-10 rounded-lg border border-border-default cursor-pointer" />
                <input type="text" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} className="flex-1 bg-input-solid/50 border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary font-mono outline-none focus:border-purple-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Secundaria</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)} className="w-10 h-10 rounded-lg border border-border-default cursor-pointer" />
                <input type="text" value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)} className="flex-1 bg-input-solid/50 border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary font-mono outline-none focus:border-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Preview</h3>
          </div>
          <div className="bg-page rounded-2xl border border-border-default p-6 flex flex-col items-center gap-3">
            {logoAtual ? (
              <Image src={logoAtual} alt="Logo" width={48} height={48} className="w-12 h-12 object-contain rounded-xl" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: corPrimaria + '20' }}>
                <Type size={24} style={{ color: corPrimaria }} />
              </div>
            )}
            <span className="text-lg font-bold text-text-primary">{nomeExibicao || 'WorkID'}</span>
            <div className="flex gap-3 mt-2">
              <button className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: corPrimaria }}>Primario</button>
              <button className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: corSecundaria }}>Secundario</button>
            </div>
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {salvando ? 'Salvando...' : <><Save size={18} /> Salvar Marca Branca</>}
        </button>
      </div>
    </div>
  );
}

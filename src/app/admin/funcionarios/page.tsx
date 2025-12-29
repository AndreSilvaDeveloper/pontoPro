'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, MapPin, RefreshCw, User, Upload, Clock, Pencil, X, Save, Trash2, Briefcase, Plus, Users } from 'lucide-react';
import dynamic from 'next/dynamic';

// Importa o Mapa dinamicamente
const MapaCaptura = dynamic(() => import('@/components/MapaCaptura'), { 
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Carregando Mapa...</div>
});

interface Funcionario {
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
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [lojaAtual, setLojaAtual] = useState('Carregando...');
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tituloCargo, setTituloCargo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  
  // === AQUI ESTÁ A CORREÇÃO: ESTADO DA FOTO ===
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  
  // Novos Campos
  const [pontoLivre, setPontoLivre] = useState(false);
  const [locaisExtras, setLocaisExtras] = useState<any[]>([]);
  const [novoLocal, setNovoLocal] = useState({ nome: '', lat: '', lng: '', raio: '100' });

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

  useEffect(() => { carregarLista(); }, []);

  useEffect(() => {
    axios.get('/api/admin/empresa')
      .then(res => setLojaAtual(res.data.nome))
      .catch(() => setLojaAtual('Minha Empresa'));
  }, []);

  const carregarLista = async () => {
    try {
        const res = await axios.get('/api/admin/funcionarios');
        setFuncionarios(res.data);
    } catch (e) { console.error("Erro ao carregar lista"); }
  };

  const abrirNovoCadastro = () => {
    setIdEdicao(null);
    setNome(''); setEmail(''); setTituloCargo(''); 
    setLat(''); setLng(''); setRaio('100');
    setJornada(jornadaPadrao);
    setPontoLivre(false); setLocaisExtras([]); 
    setFotoArquivo(null); // Limpa foto
    setShowModal(true);
  };

  const iniciarEdicao = (f: Funcionario) => {
    setIdEdicao(f.id);
    setNome(f.nome);
    setEmail(f.email);
    setTituloCargo(f.tituloCargo || '');
    setLat(f.latitudeBase.toString());
    setLng(f.longitudeBase.toString());
    setRaio(f.raioPermitido.toString());
    setJornada(f.jornada || jornadaPadrao);
    setPontoLivre(f.pontoLivre || false);
    setLocaisExtras(f.locaisAdicionais || []);
    setFotoArquivo(null); // Limpa foto (só preenche se for trocar)
    setShowModal(true);
  };

  const fecharModal = () => { setShowModal(false); setIdEdicao(null); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pontoLivre && (!lat || !lng)) return alert('Defina a localização principal!');
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('tituloCargo', tituloCargo);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('raio', raio);
      formData.append('jornada', JSON.stringify(jornada)); 
      formData.append('pontoLivre', String(pontoLivre));
      formData.append('locaisAdicionais', JSON.stringify(locaisExtras));

      // === ENVIA A FOTO SE TIVER ===
      if (fotoArquivo) formData.append('foto', fotoArquivo);

      if (idEdicao) {
        formData.append('id', idEdicao);
        await axios.put('/api/admin/funcionarios', formData);
        alert('Atualizado com sucesso!');
      } else {
        await axios.post('/api/admin/funcionarios', formData);
        alert('Cadastrado com sucesso!');
      }
      
      fecharModal();
      carregarLista();
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.erro) {
        alert(error.response.data.erro);
      } else {
        alert('Ocorreu um erro ao salvar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const excluirFuncionario = async (id: string, nome: string) => {
    if (confirm(`Excluir ${nome}?`)) {
      try {
        await axios.delete(`/api/admin/funcionarios?id=${id}`);
        carregarLista();
      } catch (error) { alert('Erro ao excluir.'); }
    }
  };

  const updateJornada = (dia: string, campo: string, valor: any) => {
    setJornada((prev: any) => ({
        ...prev,
        [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  const pegarLocalizacaoAtual = (destino: 'PRINCIPAL' | 'EXTRA') => {
    navigator.geolocation.getCurrentPosition((pos) => {
      if (destino === 'PRINCIPAL') {
          setLat(String(pos.coords.latitude));
          setLng(String(pos.coords.longitude));
      } else {
          setNovoLocal({ ...novoLocal, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
      }
    }, (erro) => alert("Erro ao pegar GPS."));
  };

  const addLocalExtra = () => {
      if(!novoLocal.nome || !novoLocal.lat) return alert("Defina nome e local.");
      setLocaisExtras([...locaisExtras, { ...novoLocal }]);
      setNovoLocal({ nome: '', lat: '', lng: '', raio: '100' });
  };

  const removeLocalExtra = (idx: number) => {
      const novaLista = [...locaisExtras];
      novaLista.splice(idx, 1);
      setLocaisExtras(novaLista);
  };

  const resetarSenha = async (id: string, nomeFunc: string) => {
    if (!confirm(`Resetar senha de ${nomeFunc}?`)) return;
    try { await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id }); alert('Senha resetada!'); } catch (error) { alert('Erro ao resetar.'); }
  };

  const aoClicarNoMapa = (novaLat: number, novaLng: number) => {
      setLat(String(novaLat));
      setLng(String(novaLng));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOPO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-purple-400 flex items-center gap-2"><Users size={24}/> Gestão de Equipe</h1>
            <p className="text-slate-400 text-sm">{lojaAtual}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link href="/admin" className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-xl transition-colors font-bold text-sm">
                <ArrowLeft size={18} /> Voltar
            </Link>
            <button onClick={abrirNovoCadastro} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-green-900/20 text-sm">
                <UserPlus size={18} /> Novo
            </button>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="grid gap-3">
          {funcionarios.length === 0 && <p className="text-slate-500 text-center py-10">Nenhum funcionário cadastrado.</p>}
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-md">
              <div className="flex items-center gap-4">
                {func.fotoPerfilUrl ? (
                  <img src={func.fotoPerfilUrl} alt={func.nome} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 flex-shrink-0">
                    <User size={20} className="text-slate-500" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <h3 className="font-bold text-white text-base truncate">{func.nome}</h3>
                  <p className="text-xs text-slate-400 truncate">{func.email}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                      {func.tituloCargo && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-purple-400 font-bold uppercase">{func.tituloCargo}</span>}
                      {func.pontoLivre && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Livre</span>}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
                <button onClick={() => iniciarEdicao(func)} className="flex items-center justify-center gap-2 py-2 bg-slate-800 text-blue-400 rounded-lg text-xs font-bold active:scale-95 transition-transform"><Pencil size={14} /> Editar</button>
                <button onClick={() => resetarSenha(func.id, func.nome)} className="flex items-center justify-center gap-2 py-2 bg-slate-800 text-yellow-500 rounded-lg text-xs font-bold active:scale-95 transition-transform"><RefreshCw size={14} /> Senha</button>
                <button onClick={() => excluirFuncionario(func.id, func.nome)} className="flex items-center justify-center gap-2 py-2 bg-slate-800 text-red-500 rounded-lg text-xs font-bold active:scale-95 transition-transform"><Trash2 size={14} /> Excluir</button>
              </div>
            </div>
          ))}
        </div>

        {/* === MODAL DE CADASTRO === */}
        {showModal && (
          <div className="fixed inset-0 z-[60] md:flex md:items-center md:justify-center bg-slate-950 md:bg-black/80 md:backdrop-blur-sm">
            <div className="bg-slate-950 md:bg-slate-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:border md:border-slate-700 shadow-2xl flex flex-col">
              
              <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 md:rounded-t-2xl flex-shrink-0">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  {idEdicao ? <><Pencil size={20} className="text-blue-400"/> Editar Funcionario</> : <><UserPlus size={20} className="text-green-400"/> Novo Cadastro</>}
                </h2>
                <button onClick={fecharModal} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
                <form id="formFuncionario" onSubmit={salvar} className="space-y-6">
                    
                    {/* 1. DADOS BÁSICOS */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">Dados Pessoais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Nome Completo</label>
                                <input className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Maria Silva" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Email (Login)</label>
                                <input type="email" className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@exemplo.com" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-2"><Briefcase size={12}/> Cargo (Opcional)</label>
                            <input placeholder="Ex: Vendedor" className="w-full bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-white outline-none focus:border-purple-500 transition-all" value={tituloCargo} onChange={e => setTituloCargo(e.target.value)} />
                        </div>
                    </section>

                    {/* 2. JORNADA DE TRABALHO */}
                    <section className="space-y-3">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2"><Clock size={16}/> Horários</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
                                <div key={dia} className={`p-3 rounded-xl border transition-all ${jornada[dia]?.ativo ? 'bg-slate-900 border-purple-900/50' : 'bg-slate-900/30 border-slate-800 opacity-60'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold uppercase text-sm text-slate-300">{dia}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={jornada[dia]?.ativo} onChange={(e) => updateJornada(dia, 'ativo', e.target.checked)} className="sr-only peer"/>
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                    
                                    {jornada[dia]?.ativo && (
                                        <div className="grid grid-cols-2 gap-2 text-center">
                                            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                <p className="text-[10px] text-slate-500 mb-1">MANHÃ</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <input type="time" value={jornada[dia].e1} onChange={e=>updateJornada(dia, 'e1', e.target.value)} className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-0" />
                                                    <span className="text-slate-600">-</span>
                                                    <input type="time" value={jornada[dia].s1} onChange={e=>updateJornada(dia, 's1', e.target.value)} className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-0" />
                                                </div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                <p className="text-[10px] text-slate-500 mb-1">TARDE</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <input type="time" value={jornada[dia].e2} onChange={e=>updateJornada(dia, 'e2', e.target.value)} className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-0" />
                                                    <span className="text-slate-600">-</span>
                                                    <input type="time" value={jornada[dia].s2} onChange={e=>updateJornada(dia, 's2', e.target.value)} className="bg-transparent text-white text-xs font-mono w-full text-center outline-none p-0" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                         </div>
                    </section>

                    {/* 3. LOCALIZAÇÃO */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2"><MapPin size={16}/> Localização</h3>
                        
                        <label className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${pontoLivre ? 'bg-purple-600 border-purple-600' : 'border-slate-500'}`}>
                                {pontoLivre && <User size={12} className="text-white"/>}
                            </div>
                            <input type="checkbox" checked={pontoLivre} onChange={e=>setPontoLivre(e.target.checked)} className="hidden" />
                            <div>
                                <span className="font-bold block text-sm text-white">Trabalho Externo (Livre)</span>
                                <span className="text-xs text-slate-400">Funcionário pode bater ponto em qualquer lugar.</span>
                            </div>
                        </label>

                        {!pontoLivre && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <MapaCaptura latInicial={lat} lngInicial={lng} aoSelecionar={aoClicarNoMapa} />

                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-purple-400 uppercase">Sede Principal</span>
                                        <button type="button" onClick={()=>pegarLocalizacaoAtual('PRINCIPAL')} className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-900/50">
                                            <MapPin size={12}/> Pegar GPS
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input placeholder="Latitude" value={lat} onChange={e=>setLat(e.target.value)} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white"/>
                                        <input placeholder="Longitude" value={lng} onChange={e=>setLng(e.target.value)} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white"/>
                                        <div className="relative">
                                            <input type="number" placeholder="Raio" value={raio} onChange={e=>setRaio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-xs text-white pl-12"/>
                                            <span className="absolute left-3 top-3 text-xs text-slate-500">Raio:</span>
                                            <span className="absolute right-3 top-3 text-xs text-slate-500">m</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Locais Extras (Obras/Filiais)</p>
                                    {locaisExtras.map((loc, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-700 mb-2">
                                            <span className="text-xs font-bold">{loc.nome}</span>
                                            <button type="button" onClick={()=>removeLocalExtra(idx)} className="text-red-400 p-1"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex gap-2">
                                            <input placeholder="Nome (Ex: Obra B)" value={novoLocal.nome} onChange={e=>setNovoLocal({...novoLocal, nome: e.target.value})} className="flex-1 bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs text-white"/>
                                            <button type="button" onClick={()=>pegarLocalizacaoAtual('EXTRA')} className="bg-slate-800 text-blue-400 p-2.5 rounded-lg border border-slate-700"><MapPin size={16}/></button>
                                        </div>
                                        <button type="button" onClick={addLocalExtra} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-lg text-xs font-bold border border-slate-700 border-dashed">+ Adicionar Local Extra</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* === 4. FOTO DE PERFIL (RECUPERADA) === */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                            <Upload size={16}/> Biometria / Foto
                        </h3>
                        
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-center gap-4 hover:bg-slate-800/50 transition-colors">
                            {fotoArquivo ? (
                                <div className="relative">
                                    <img src={URL.createObjectURL(fotoArquivo)} className="w-24 h-24 rounded-full object-cover border-4 border-purple-500" />
                                    <button type="button" onClick={() => setFotoArquivo(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button>
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                                    <User size={32} className="text-slate-500"/>
                                </div>
                            )}
                            
                            <div className="space-y-1">
                                <label htmlFor="foto-upload" className="block text-purple-400 font-bold text-sm cursor-pointer hover:underline">
                                    {idEdicao ? 'Alterar Foto Atual' : 'Enviar Foto de Rosto'}
                                </label>
                                <p className="text-xs text-slate-500">Necessário para reconhecimento facial</p>
                            </div>
                            
                            <input 
                                id="foto-upload"
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => setFotoArquivo(e.target.files?.[0] || null)} 
                                className="hidden" 
                            />
                        </div>
                    </section>
                </form>
              </div>

              {/* Footer Fixo do Modal (Salvar) */}
              <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 md:rounded-b-2xl flex-shrink-0">
                <button 
                    onClick={salvar} // Dispara o form externamente
                    disabled={loading} 
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base ${idEdicao ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-green-600 hover:bg-green-700 shadow-green-900/20'}`}
                >
                    {loading ? <RefreshCw className="animate-spin" size={20}/> : <><Save size={20}/> {idEdicao ? 'Atualizar Dados' : 'Finalizar Cadastro'}</>}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
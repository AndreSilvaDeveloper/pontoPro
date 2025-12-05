'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, MapPin, RefreshCw, User, Upload } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  latitudeBase: number;
  longitudeBase: number;
  fotoPerfilUrl?: string; // Novo
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  
  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null); // Novo estado para o arquivo

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarLista();
  }, []);

  const carregarLista = async () => {
    const res = await axios.get('/api/admin/funcionarios');
    setFuncionarios(res.data);
  };

  const pegarLocalizacaoAtual = () => {
    if (!navigator.geolocation) return alert('Sem GPS');
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toString());
      setLng(pos.coords.longitude.toString());
    });
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) return alert('Defina a localização da empresa!');
    
    setLoading(true);
    try {
      // Prepara o pacote de dados (FormData)
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('raio', raio);
      
      if (fotoArquivo) {
        formData.append('foto', fotoArquivo); // Anexa o arquivo
      }

      // Envia para a API (Note que não precisamos setar headers manualmente, o axios faz isso)
      await axios.post('/api/admin/funcionarios', formData);
      
      // Limpa tudo
      setNome(''); setEmail(''); setFotoArquivo(null);
      // Opcional: limpar GPS também se quiser
      carregarLista();
      alert('Funcionário cadastrado com Foto Oficial!');
    } catch (error) {
      alert('Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  const resetarSenha = async (id: string, nomeFunc: string) => {
    if (!confirm(`Resetar senha de ${nomeFunc}?`)) return;
    try {
      await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id });
      alert('Senha resetada!');
    } catch (error) {
      alert('Erro ao resetar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Gestão de Equipe</h1>
            <p className="text-slate-400 text-sm">Cadastre funcionários com biometria facial.</p>
          </div>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Voltar
          </Link>
        </div>

        {/* Formulário */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="font-bold mb-4 flex items-center gap-2 text-green-400">
            <UserPlus size={20}/> Novo Cadastro
          </h2>
          
          <form onSubmit={cadastrar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder="Nome completo" 
                className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white"
                value={nome} onChange={e => setNome(e.target.value)} required
              />
              <input 
                placeholder="Email profissional" 
                type="email"
                className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>

            {/* Upload da Foto de Referência */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 border-dashed">
               <label className="block text-sm text-slate-400 mb-2 font-bold flex items-center gap-2">
                 <Upload size={16} /> Foto de Rosto (Para Reconhecimento Facial)
               </label>
               <input 
                 type="file" 
                 accept="image/*"
                 onChange={(e) => setFotoArquivo(e.target.files?.[0] || null)}
                 className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800 cursor-pointer"
               />
               <p className="text-xs text-slate-600 mt-1">Envie uma foto clara, de frente, estilo 3x4.</p>
            </div>

            {/* Área de Regras Geográficas */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs text-slate-500">Latitude</label>
                  <input value={lat} readOnly className="w-full bg-slate-800 p-2 rounded text-slate-400 cursor-not-allowed" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs text-slate-500">Longitude</label>
                  <input value={lng} readOnly className="w-full bg-slate-800 p-2 rounded text-slate-400 cursor-not-allowed" />
                </div>
                <div className="w-full md:w-32">
                   <label className="text-xs text-slate-500">Raio (m)</label>
                   <input 
                    type="number" value={raio} onChange={e => setRaio(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 p-2 rounded text-white" 
                   />
                </div>
                <button 
                  type="button" onClick={pegarLocalizacaoAtual}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-sm h-[42px] whitespace-nowrap"
                >
                  <MapPin size={16} /> Pegar GPS Atual
                </button>
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold transition-colors"
            >
              {loading ? 'Salvando...' : 'Cadastrar Funcionário'}
            </button>
          </form>
        </div>

        {/* Lista de Funcionários */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-400">Equipe Ativa</h3>
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Mostra a foto se tiver, senão ícone */}
                {func.fotoPerfilUrl ? (
                  <img src={func.fotoPerfilUrl} alt={func.nome} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                    <User size={24} className="text-slate-500" />
                  </div>
                )}
                
                <div>
                  <h3 className="font-bold text-white">{func.nome}</h3>
                  <p className="text-sm text-slate-400">{func.email}</p>
                </div>
              </div>
              
              <button 
                onClick={() => resetarSenha(func.id, func.nome)}
                className="p-2 text-yellow-600 hover:text-yellow-500 transition-colors"
                title="Resetar Senha"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
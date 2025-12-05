'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, MapPin, RefreshCw, Trash2, User } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  latitudeBase: number;
  longitudeBase: number;
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  
  // Novos campos de Geofencing
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100'); // 100 metros padrão

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarLista();
  }, []);

  const carregarLista = async () => {
    const res = await axios.get('/api/admin/funcionarios');
    setFuncionarios(res.data);
  };

  // Função mágica para pegar o GPS do Admin na hora do cadastro
  const pegarLocalizacaoAtual = () => {
    if (!navigator.geolocation) return alert('Sem GPS');
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toString());
      setLng(pos.coords.longitude.toString());
    });
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) return alert('Por favor, defina a localização da empresa (clique no botão azul)');
    
    setLoading(true);
    try {
      await axios.post('/api/admin/funcionarios', { 
        nome, email, latitude: lat, longitude: lng, raio 
      });
      setNome(''); setEmail('');
      carregarLista();
      alert('Funcionário cadastrado com as regras de local!');
    } catch (error) {
      alert('Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  const resetarSenha = async (id: string, nomeFunc: string) => {
    if (!confirm(`Deseja resetar a senha de ${nomeFunc} para "mudar123"?`)) return;
    try {
      await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id });
      alert('Senha resetada com sucesso!');
    } catch (error) {
      alert('Erro ao resetar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Gestão de Equipe & Regras</h1>
            <p className="text-slate-400 text-sm">Defina quem pode bater ponto e onde.</p>
          </div>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Voltar
          </Link>
        </div>

        {/* Formulário Poderoso */}
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

            {/* Área de Regras Geográficas */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-3 font-bold">📍 Regra de Localização (Cerca Eletrônica)</p>
              
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
                   <label className="text-xs text-slate-500">Raio (metros)</label>
                   <input 
                    type="number"
                    value={raio} 
                    onChange={e => setRaio(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 p-2 rounded text-white" 
                   />
                </div>
                
                <button 
                  type="button"
                  onClick={pegarLocalizacaoAtual}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-sm h-[42px] whitespace-nowrap"
                >
                  <MapPin size={16} /> Pegar Local Atual
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * Clique no botão estando na empresa. O funcionário só conseguirá bater ponto num raio de {raio}m desse local.
              </p>
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
          <h3 className="font-bold text-slate-400">Funcionários Ativos</h3>
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold">{func.nome}</h3>
                  <p className="text-sm text-slate-400">{func.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <div className="px-3 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={12} />
                    {func.latitudeBase.toFixed(4)}, {func.longitudeBase.toFixed(4)}
                 </div>

                 <button 
                   onClick={() => resetarSenha(func.id, func.nome)}
                   className="flex items-center gap-2 px-3 py-2 bg-yellow-600/10 text-yellow-500 hover:bg-yellow-600 hover:text-white rounded-lg transition-colors text-sm border border-yellow-600/20"
                   title="Resetar Senha"
                 >
                   <RefreshCw size={14} /> Resetar Senha
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Building2,
  Lock,
  Ban,
  PlayCircle,
  RefreshCw,
  LogOut,
  Settings,
  Trash2,
  UserPlus,
  X,
  Loader2,
  Users,
  Link as LinkIcon,
  FileText,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// === FUNÇÕES AUXILIARES PARA GERAR PIX (EMV) ===

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const emv = (id: string, value: string) => {
  const size = value.length.toString().padStart(2, "0");
  return `${id}${size}${value}`;
};

const crc16ccitt = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
};

// === CORREÇÃO DA SANITIZAÇÃO DA CHAVE ===
const formatarChaveParaPayload = (chave: string) => {
  const limpa = chave.trim();

  // 1. Chave Aleatória (EVP) - Mantém os hífens
  // Ex: 123e4567-e89b-12d3-a456-426614174000 (36 chars)
  if (
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      limpa
    )
  ) {
    return limpa;
  }

  // 2. Email - Mantém tudo
  if (limpa.includes("@")) {
    return limpa;
  }

  // 3. Telefone Internacional - Mantém o +
  if (limpa.startsWith("+")) {
    return limpa;
  }

  // 4. CPF/CNPJ ou Telefone sem formato - Remove tudo que não é número
  // (Remove pontos, traços, barras e parênteses)
  return limpa.replace(/[^0-9]/g, "");
};

const gerarPayloadPix = (
  chave: string,
  nome: string,
  cidade: string,
  valor?: string,
  txid: string = "***"
) => {
  const chaveFormatada = formatarChaveParaPayload(chave);

  const nomeLimpo = normalizeText(nome).substring(0, 25);
  const cidadeLimpa = normalizeText(cidade).substring(0, 15);

  let payload =
    emv("00", "01") +
    emv(
      "26",
      emv("00", "BR.GOV.BCB.PIX") + emv("01", chaveFormatada) // Usa a chave tratada corretamente
    ) +
    emv("52", "0000") +
    emv("53", "986");

  if (valor) {
    const valorStr = parseFloat(valor).toFixed(2);
    payload += emv("54", valorStr);
  }

  payload +=
    emv("58", "BR") +
    emv("59", nomeLimpo) +
    emv("60", cidadeLimpa) +
    emv("62", emv("05", txid)) +
    "6304";

  const crc = crc16ccitt(payload);
  return payload + crc;
};

export default function SuperAdminPage() {
  // === ESTADOS GERAIS ===
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingListar, setLoadingListar] = useState(false);

  // === CADASTRO EMPRESA ===
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [senhaInicial, setSenhaInicial] = useState("1234");
  const [loadingCriar, setLoadingCriar] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  // === MODAIS ===
  const [modalAdminOpen, setModalAdminOpen] = useState(false);
  const [modalEquipeOpen, setModalEquipeOpen] = useState(false);
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [modalFaturaOpen, setModalFaturaOpen] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [matrizAlvoId, setMatrizAlvoId] = useState("");
  const [loadingVinculo, setLoadingVinculo] = useState(false);

  const [adminData, setAdminData] = useState({
    nome: "",
    email: "",
    senha: "123",
  });
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // === DADOS PARA FATURA ===
  const [chavePixManual, setChavePixManual] = useState("118.544.546-33");
  const [loadingFatura, setLoadingFatura] = useState(false);

  useEffect(() => {
    listarEmpresas();
  }, []);

  const listarEmpresas = async () => {
    setLoadingListar(true);
    try {
      const res = await axios.post("/api/saas/gestao");
      setEmpresas(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) return;
      console.error("Erro listar", error);
    } finally {
      setLoadingListar(false);
    }
  };

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCriar(true);
    setResultado(null);
    try {
      const res = await axios.post("/api/saas/criar-empresa", {
        nomeEmpresa,
        cnpj,
        nomeDono,
        emailDono,
        senhaInicial,
      });
      setResultado(res.data);
      setNomeEmpresa("");
      setCnpj("");
      setNomeDono("");
      setEmailDono("");
      listarEmpresas();
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao criar.");
    } finally {
      setLoadingCriar(false);
    }
  };

  const salvarVinculo = async () => {
    if (!matrizAlvoId) return alert("Selecione uma matriz");
    setLoadingVinculo(true);
    try {
      await axios.put("/api/saas/gestao", {
        empresaId: empresaSelecionada.id,
        acao: "VINCULAR_MATRIZ",
        matrizId: matrizAlvoId,
      });
      alert("Empresa vinculada com sucesso!");
      setModalVincularOpen(false);
      listarEmpresas();
    } catch (error) {
      alert("Erro ao vincular");
    } finally {
      setLoadingVinculo(false);
    }
  };

  const excluirUsuario = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;
    try {
      await axios.delete("/api/saas/excluir-usuario", { data: { id: userId } });
      const novaLista = empresaSelecionada.usuarios.filter(
        (u: any) => u.id !== userId
      );
      setEmpresaSelecionada({ ...empresaSelecionada, usuarios: novaLista });
      listarEmpresas();
    } catch (e: any) {
      alert(e.response?.data?.erro || "Erro ao excluir usuário");
    }
  };

  const salvarNovoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAdmin(true);
    try {
      await axios.post("/api/saas/novo-admin", {
        empresaId: empresaSelecionada.id,
        nome: adminData.nome,
        email: adminData.email,
        senha: adminData.senha,
      });
      alert(`Acesso criado para ${adminData.nome}!`);
      setModalAdminOpen(false);
      listarEmpresas();
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao criar admin");
    } finally {
      setLoadingAdmin(false);
    }
  };

  const alternarStatus = async (id: string, nome: string, status: string) => {
    const acao = status === "ATIVO" ? "BLOQUEAR" : "ATIVAR";
    if (!confirm(`Deseja ${acao} a empresa ${nome}?`)) return;
    try {
      await axios.put("/api/saas/gestao", {
        empresaId: id,
        acao: "ALTERAR_STATUS",
      });
      listarEmpresas();
    } catch (e) {
      alert("Erro ao alterar status");
    }
  };

  const excluirEmpresa = async (id: string, nome: string) => {
    const confirmacao = window.prompt(
      `PERIGO: Isso apagará TODOS os dados de "${nome}".\nDigite "DELETAR" para confirmar:`
    );
    if (confirmacao !== "DELETAR") return;
    try {
      await axios.delete("/api/saas/excluir-empresa", { data: { id } });
      alert("Empresa excluída!");
      listarEmpresas();
    } catch (e: any) {
      alert(e.response?.data?.erro || "Erro ao excluir");
    }
  };

  const calcularFinanceiro = (matriz: any) => {
    let totalVidas = matriz._count?.usuarios || 0;
    let totalAdmins = matriz.usuarios?.length || 0;

    if (matriz.filiais && matriz.filiais.length > 0) {
      matriz.filiais.forEach((f: any) => {
        totalVidas += f._count?.usuarios || 0;
        totalAdmins += f.usuarios?.length || 0;
      });
    }

    const VALOR_BASE = 99.9;
    const FRANQUIA_VIDAS = 20;
    const FRANQUIA_ADMINS = 1;
    const PRECO_VIDA_EXTRA = 7.9;
    const PRECO_ADMIN_EXTRA = 49.9;

    const vidasExcedentes = Math.max(0, totalVidas - FRANQUIA_VIDAS);
    const adminsExcedentes = Math.max(0, totalAdmins - FRANQUIA_ADMINS);

    const custoVidas = vidasExcedentes * PRECO_VIDA_EXTRA;
    const custoAdmins = adminsExcedentes * PRECO_ADMIN_EXTRA;
    const valorFinal = VALOR_BASE + custoVidas + custoAdmins;

    return {
      totalVidas,
      totalAdmins,
      vidasExcedentes,
      adminsExcedentes,
      custoVidas,
      custoAdmins,
      valorFinal,
    };
  };

  const abrirModalFatura = (empresa: any) => {
    setEmpresaSelecionada(empresa);
    setModalFaturaOpen(true);
  };

  // === GERAR FATURA INDIVIDUAL (PDF VISUALIZÁVEL) ===
  const gerarFaturaIndividual = async () => {
    setLoadingFatura(true);

    // Abre a janela imediatamente
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(
        '<html><head><title>Gerando Fatura...</title></head><body style="background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h3>Gerando Fatura... Aguarde.</h3></body></html>'
      );
    }

    try {
      const empresa = empresaSelecionada;
      const fin = calcularFinanceiro(empresa);
      const doc = new jsPDF();
      const hoje = new Date();
      const vencimento = new Date();
      vencimento.setDate(15);
      if (hoje.getDate() > 15) vencimento.setMonth(vencimento.getMonth() + 1);

      // Gera Payload com a chave já tratada
      const payloadPix = gerarPayloadPix(
        chavePixManual,
        "Ontime Sistemas",
        "Juiz de Fora",
        fin.valorFinal.toFixed(2),
        `FAT${format(new Date(), "MMyy")}`
      );

      // Cabeçalho
      doc.setFillColor(88, 28, 135);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ONTIME SISTEMAS", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Demonstrativo de Serviços e Cobrança", 14, 30);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`VENCIMENTO: ${format(vencimento, "dd/MM/yyyy")}`, 195, 20, {
        align: "right",
      });
      doc.setFontSize(14);
      doc.text(
        `TOTAL: ${fin.valorFinal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`,
        195,
        30,
        { align: "right" }
      );

      // Dados
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("CLIENTE:", 14, 55);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${empresa.nome.toUpperCase()}`, 14, 62);
      doc.text(`CNPJ: ${empresa.cnpj || "Não Informado"}`, 14, 68);
      doc.text(
        `Responsável: ${empresa.usuarios?.[0]?.nome || "Admin"}`,
        14,
        74
      );

      // Tabela
      const dadosTabela = [
        ["Assinatura Mensal (Pacote Base)", "1", "R$ 99,90", "R$ 99,90"],
      ];
      if (fin.vidasExcedentes > 0)
        dadosTabela.push([
          `Funcionários Excedentes (${fin.vidasExcedentes} x R$ 7,90)`,
          `${fin.vidasExcedentes}`,
          "R$ 7,90",
          fin.custoVidas.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        ]);
      if (fin.adminsExcedentes > 0)
        dadosTabela.push([
          `Administradores Adicionais (${fin.adminsExcedentes} x R$ 49,90)`,
          `${fin.adminsExcedentes}`,
          "R$ 49,90",
          fin.custoAdmins.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        ]);

      autoTable(doc, {
        head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
        body: dadosTabela,
        startY: 85,
        theme: "striped",
        headStyles: { fillColor: [55, 65, 81] },
        columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
        foot: [
          [
            "",
            "",
            "TOTAL A PAGAR",
            fin.valorFinal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
          ],
        ],
        footStyles: {
          fillColor: [240, 253, 244],
          textColor: [22, 101, 52],
          fontStyle: "bold",
          halign: "right",
        },
      });

      // Área Pagamento
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY + 20;

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, finalY, 182, 75, 3, 3, "FD");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 28, 135);
      doc.text("PAGAMENTO VIA PIX", 20, finalY + 12);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Chave Pix:", 20, finalY + 25);
      doc.setFontSize(12);
      doc.text(chavePixManual, 20, finalY + 32);

      // QR Code Imagem
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          payloadPix
        )}`;
        doc.addImage(qrUrl, "PNG", 135, finalY + 5, 50, 50);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Escaneie no App do Banco", 142, finalY + 60);
      } catch (e) {
        doc.rect(135, finalY + 5, 50, 50);
        doc.text("Erro QR", 145, finalY + 30);
      }

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Copia e Cola:", 20, finalY + 45);
      const splitPayload = doc.splitTextToSize(payloadPix, 110);
      doc.text(splitPayload, 20, finalY + 52);

      doc.setFontSize(8);
      doc.text(
        "Este documento não possui valor fiscal de Nota Fiscal.",
        105,
        285,
        { align: "center" }
      );

      const blobUrl = doc.output("bloburl");
      if (janela) janela.location.href = String(blobUrl);
      else window.open(String(blobUrl), "_blank");

      setModalFaturaOpen(false);
    } catch (e) {
      if (janela) janela.close();
      alert("Erro ao gerar fatura.");
    } finally {
      setLoadingFatura(false);
    }
  };

  const gerarRelatorioGeral = () => {
    const doc = new jsPDF();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Geral de Faturamento", 14, 20);

    const dadosTabela = empresas.map((emp) => {
      const fin = calcularFinanceiro(emp);
      return [
        emp.nome,
        emp.cnpj || "N/A",
        fin.totalVidas,
        fin.totalAdmins,
        fin.valorFinal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      ];
    });

    autoTable(doc, {
      head: [["Empresa", "CNPJ", "Funcionários", "Admins", "Valor"]],
      body: dadosTabela,
      startY: 50,
    });

    window.open(doc.output("bloburl"), "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="absolute top-6 right-6 flex gap-2">
        <button
          onClick={gerarRelatorioGeral}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-bold shadow-lg shadow-emerald-900/20"
        >
          <FileText size={16} /> Relatório Geral
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg border border-red-900 transition-colors text-sm font-bold"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 pt-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-purple-500 flex justify-center items-center gap-2">
            🛡️ Super Admin
          </h1>
          <p className="text-gray-400">Painel de Controle Geral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl h-fit sticky top-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
              <Building2 /> Nova Venda
            </h2>
            {resultado && (
              <div className="bg-green-900/30 border border-green-500 p-4 rounded-xl mb-4 animate-pulse">
                <p className="font-bold text-green-400 mb-2">
                  ✅ Cliente Criado!
                </p>
                <div className="text-xs font-mono space-y-1 text-gray-300">
                  <p>Empresa: {resultado.dados.empresa}</p>
                  <p>
                    Login:{" "}
                    <span className="text-white select-all">
                      {resultado.dados.login}
                    </span>
                  </p>
                  <p>
                    Senha:{" "}
                    <span className="text-white select-all">
                      {resultado.dados.senha}
                    </span>
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={criarCliente} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm"
                  placeholder="Empresa"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  required
                />
                <input
                  className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm"
                  placeholder="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm"
                  placeholder="Nome Dono"
                  value={nomeDono}
                  onChange={(e) => setNomeDono(e.target.value)}
                  required
                />
                <input
                  className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm"
                  placeholder="Email Login"
                  value={emailDono}
                  onChange={(e) => setEmailDono(e.target.value)}
                  required
                />
              </div>
              <button
                disabled={loadingCriar}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold transition-all disabled:opacity-50"
              >
                {loadingCriar ? "Criando..." : "CRIAR CLIENTE"}
              </button>
            </form>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-[650px] flex flex-col shadow-xl">
            <div className="flex justify-between mb-4 items-center">
              <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <Lock /> Carteira de Clientes
              </h2>
              <button
                onClick={listarEmpresas}
                className="text-blue-400 hover:bg-blue-900/30 p-2 rounded transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loadingListar ? (
                <p className="text-center text-gray-500 py-10">Carregando...</p>
              ) : (
                empresas.map((matriz) => {
                  const dadosFin = calcularFinanceiro(matriz);
                  return (
                    <div
                      key={matriz.id}
                      className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800/50"
                    >
                      <div
                        className={`p-4 flex justify-between items-center ${
                          matriz.status === "BLOQUEADO"
                            ? "bg-red-900/20"
                            : "bg-gray-800"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-purple-500" />
                            <p
                              className={`font-bold text-base ${
                                matriz.status === "BLOQUEADO"
                                  ? "text-red-400"
                                  : "text-white"
                              }`}
                            >
                              {matriz.nome}
                            </p>
                            <div className="flex gap-1 ml-2">
                              <span
                                className="text-[9px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center gap-1"
                                title="Funcionários"
                              >
                                <Users size={10} /> {dadosFin.totalVidas}
                              </span>
                              <span
                                className="text-[9px] bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold flex items-center gap-1"
                                title="Admins"
                              >
                                <Lock size={10} /> {dadosFin.totalAdmins}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            MATRIZ • {matriz.cnpj || "Sem CNPJ"}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => abrirModalFatura(matriz)}
                            className="p-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded"
                            title="Gerar Fatura"
                          >
                            <DollarSign size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEmpresaSelecionada(matriz);
                              setMatrizAlvoId("");
                              setModalVincularOpen(true);
                            }}
                            className="p-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600 hover:text-white rounded"
                            title="Transformar em Filial"
                          >
                            <LinkIcon size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEmpresaSelecionada(matriz);
                              setModalEquipeOpen(true);
                            }}
                            className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded"
                            title="Equipe Matriz"
                          >
                            <Users size={14} />
                          </button>
                          <Link
                            href={`/saas/${matriz.id}`}
                            className="p-2 bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white rounded"
                          >
                            <Settings size={14} />
                          </Link>
                          <button
                            onClick={() =>
                              alternarStatus(
                                matriz.id,
                                matriz.nome,
                                matriz.status
                              )
                            }
                            className={`p-2 rounded ${
                              matriz.status === "ATIVO"
                                ? "text-orange-400 hover:bg-orange-600 hover:text-white"
                                : "text-green-400 hover:bg-green-600"
                            }`}
                          >
                            {matriz.status === "ATIVO" ? (
                              <Ban size={14} />
                            ) : (
                              <PlayCircle size={14} />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              excluirEmpresa(matriz.id, matriz.nome)
                            }
                            className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {matriz.filiais && matriz.filiais.length > 0 && (
                        <div className="bg-black/20 p-2 space-y-1 border-t border-gray-700">
                          <p className="text-[10px] uppercase font-bold text-gray-500 pl-2 mb-2 mt-1">
                            Filiais Vinculadas ({matriz.filiais.length})
                          </p>
                          {matriz.filiais.map((filial: any) => (
                            <div
                              key={filial.id}
                              className="flex justify-between items-center p-2 pl-6 hover:bg-white/5 rounded-lg group"
                            >
                              <div className="flex items-center gap-3 border-l-2 border-gray-600 pl-3">
                                <div>
                                  <p className="text-sm text-gray-300 font-medium">
                                    {filial.nome}
                                  </p>
                                  <div className="flex gap-2 text-[10px] text-gray-600">
                                    <span>
                                      {filial._count?.usuarios || 0} funcs
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {filial.usuarios?.length || 0} admins
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEmpresaSelecionada(filial);
                                    setModalEquipeOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-blue-600 hover:text-white text-gray-500 rounded"
                                  title="Equipe Filial"
                                >
                                  <Users size={12} />
                                </button>
                                <button
                                  onClick={() =>
                                    excluirEmpresa(filial.id, filial.nome)
                                  }
                                  className="p-1.5 hover:bg-red-600 hover:text-white text-gray-500 rounded"
                                  title="Excluir Filial"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex justify-between items-center">
                        <span className="text-[10px] text-gray-500">
                          Excedentes: {dadosFin.vidasExcedentes} vidas /{" "}
                          {dadosFin.adminsExcedentes} admins
                        </span>
                        <span className="text-xs text-gray-500">
                          Fatura Estimada:{" "}
                          <strong className="text-emerald-400">
                            {dadosFin.valorFinal.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {modalFaturaOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setModalFaturaOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-1 text-white flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-500" /> Gerar Fatura
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Fatura para{" "}
              <span className="text-white font-bold">
                {empresaSelecionada.nome}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold text-gray-500 mb-1 block">
                  Chave Pix (CPF/Email/Tel/Aleatória)
                </label>
                <input
                  className="w-full bg-gray-800 p-3 rounded-lg text-white border border-gray-700 outline-none focus:border-emerald-500"
                  value={chavePixManual}
                  onChange={(e) => setChavePixManual(e.target.value)}
                  placeholder="Digite sua chave Pix..."
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Dica: Se for telefone, use formato internacional (ex: +55...)
                </p>
              </div>

              <button
                onClick={gerarFaturaIndividual}
                disabled={loadingFatura || !chavePixManual}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 text-white"
              >
                {loadingFatura ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "VISUALIZAR PDF"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVincularOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setModalVincularOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-1 text-white flex items-center gap-2">
              <LinkIcon size={20} className="text-yellow-500" /> Vincular Matriz
            </h3>
            <div className="space-y-4 mt-4">
              <select
                className="w-full bg-gray-800 p-3 rounded-lg text-white border border-gray-700 outline-none focus:border-yellow-500"
                value={matrizAlvoId}
                onChange={(e) => setMatrizAlvoId(e.target.value)}
              >
                <option value="">Selecione a Matriz Principal...</option>
                {empresas
                  .filter((e) => e.id !== empresaSelecionada.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome}
                    </option>
                  ))}
              </select>
              <button
                onClick={salvarVinculo}
                disabled={loadingVinculo || !matrizAlvoId}
                className="w-full bg-yellow-600 hover:bg-yellow-700 py-3 rounded-lg font-bold text-black"
              >
                {loadingVinculo ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "CONFIRMAR"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAdminOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative">
            <button
              onClick={() => setModalAdminOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-white">Novo Acesso</h3>
            <form onSubmit={salvarNovoAdmin} className="space-y-3">
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-white border border-gray-700"
                placeholder="Nome"
                onChange={(e) =>
                  setAdminData({ ...adminData, nome: e.target.value })
                }
                required
              />
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-white border border-gray-700"
                placeholder="Email"
                type="email"
                onChange={(e) =>
                  setAdminData({ ...adminData, email: e.target.value })
                }
                required
              />
              <input
                className="w-full bg-gray-800 p-2.5 rounded text-white border border-gray-700"
                placeholder="Senha"
                value={adminData.senha}
                onChange={(e) =>
                  setAdminData({ ...adminData, senha: e.target.value })
                }
                required
              />
              <button
                disabled={loadingAdmin}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold mt-2"
              >
                {loadingAdmin ? <Loader2 className="animate-spin" /> : "CRIAR"}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalEquipeOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md relative">
            <button
              onClick={() => setModalEquipeOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <Users className="text-purple-500" /> Gestão de Acessos
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {!empresaSelecionada.usuarios ||
              empresaSelecionada.usuarios.length === 0 ? (
                <p className="text-center text-gray-500">Nenhum usuário.</p>
              ) : (
                empresaSelecionada.usuarios.map((user: any) => (
                  <div
                    key={user.id}
                    className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">
                        {user.nome}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => excluirUsuario(user.id)}
                      className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setModalEquipeOpen(false);
                  setModalAdminOpen(true);
                }}
                className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white rounded text-sm flex justify-center gap-2"
              >
                <UserPlus size={16} /> Adicionar Novo Acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

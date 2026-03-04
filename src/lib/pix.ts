// src/lib/pix.ts — Helpers PIX (EMV) extraídos do painel SaaS

export const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const emv = (id: string, value: string) => {
  const size = value.length.toString().padStart(2, "0");
  return `${id}${size}${value}`;
};

export const crc16ccitt = (payload: string) => {
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

export const formatarChaveParaPayload = (chave: string) => {
  const limpa = chave.trim();

  // 1. Chave Aleatória (EVP) - Mantém os hífens
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
  return limpa.replace(/[^0-9]/g, "");
};

export const gerarPayloadPix = (
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
    emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", chaveFormatada)) +
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

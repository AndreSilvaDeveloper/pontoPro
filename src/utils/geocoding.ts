export async function obterEndereco(lat: number, lon: number) {
  // Se lat/lon vierem zerados, retorna logo
  if (!lat || !lon) return 'Localização não identificada';

  try {
    // Tenta conectar com o Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    // Adicionei um AbortController para não esperar 10s, esperar só 3s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos max

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PontoPro-SaaS/1.0 (contato@seusite.com)' // Importante para não ser bloqueado
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return `Coord: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    const data = await res.json();

    // Tenta montar um endereço bonitinho
    if (data && data.address) {
      const rua = data.address.road || data.address.pedestrian || '';
      const numero = data.address.house_number || '';
      const bairro = data.address.suburb || data.address.neighbourhood || '';
      const cidade = data.address.city || data.address.town || data.address.village || '';
      
      const partes = [rua, numero, bairro, cidade].filter(Boolean);
      return partes.join(', ') || data.display_name;
    }

    return `Coord: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  } catch (error) {
    console.error("Erro no Geocoding (Não travou o ponto):", error);
    // RETORNO DE SEGURANÇA: Se der erro, retorna as coordenadas em texto
    return `Localização aproximada (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }
}
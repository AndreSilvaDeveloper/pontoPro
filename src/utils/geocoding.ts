export async function obterEndereco(lat: number, lng: number): Promise<string> {
  try {
    // Usamos a API gratuita do OpenStreetMap
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    // É importante passar um User-Agent para eles não bloquearem
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'PontoPro-SaaS/1.0' } 
    });
    
    const data = await res.json();
    
    // Retorna o endereço formatado ou uma mensagem de erro
    return data.display_name || "Endereço não localizado";
    
  } catch (error) {
    console.error("Erro no geocoding:", error);
    return "Erro ao buscar endereço";
  }
}
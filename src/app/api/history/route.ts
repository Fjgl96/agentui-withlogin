import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  
  // Asegúrate de que esta URL coincida con tu backend desplegado
  // Nota: Deberías usar una variable de entorno para la URL base en producción
  const backendUrl = "https://cfa-backend-740905672912.us-central1.run.app"; 
  
  const url = `${backendUrl}/history?${searchParams.toString()}`;

  try {
    const apiRes = await fetch(url, {
        // Evitar cache para tener siempre el historial fresco
        cache: 'no-store' 
    });
    
    if (!apiRes.ok) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }

    const data = await apiRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  }
}
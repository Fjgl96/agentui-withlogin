import { NextRequest, NextResponse } from 'next/server';

// Forzamos que esta ruta sea dinámica para evitar caché de Vercel en streaming
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  // Asegúrate de usar tu URL correcta de Cloud Run
  const backendUrl = "https://cfa-backend-740905672912.us-central1.run.app"; 
  const url = `${backendUrl}/chat?${searchParams.toString()}`;

  try {
    const apiRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
      // Importante: no cachear streaming
      cache: 'no-store'
    });

    if (!apiRes.ok) {
      throw new Error(`Backend error: ${apiRes.status}`);
    }

    // Pasamos el stream directamente al cliente
    return new NextResponse(apiRes.body, {
      status: apiRes.status,
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error("Error en proxy agent:", error);
    return new NextResponse(JSON.stringify({ error: 'Error conectando al backend' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
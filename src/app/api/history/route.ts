import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const backendUrl = "https://cfa-backend-740905672912.us-central1.run.app"; 
  
  // Parámetros de paginación
  const threadId = searchParams.get('thread_id') || '';
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';
  
  // Si es usuario invitado, retornar vacío inmediatamente (sin llamar al backend)
  if (threadId.startsWith('guest_')) {
    return new Response(JSON.stringify({ 
      messages: [], 
      hasMore: false, 
      total: 0,
      isGuest: true 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const url = `${backendUrl}/history?thread_id=${encodeURIComponent(threadId)}&limit=${limit}&offset=${offset}`;

  try {
    const apiRes = await fetch(url, {
      cache: 'no-store',
      // Timeout de 10 segundos para evitar esperas largas
      signal: AbortSignal.timeout(10000)
    });
    
    if (!apiRes.ok) {
      return new Response(JSON.stringify({ 
        messages: [], 
        hasMore: false,
        total: 0 
      }), { status: 200 });
    }

    const data = await apiRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return new Response(JSON.stringify({ 
      messages: [], 
      hasMore: false,
      total: 0 
    }), { status: 200 });
  }
}
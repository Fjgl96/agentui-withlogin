import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  
  const url = `https://cfa-backend-740905672912.us-central1.run.app/chat?${searchParams.toString()}`;

  const apiRes = await fetch(url);
  const data = await apiRes.json();

  return new Response(JSON.stringify(data), {
    status: apiRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
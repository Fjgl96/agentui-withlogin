// src/app/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';

type Mensaje = { de: 'usuario' | 'bot'; texto: string };

export default function Page() {
  const { data: session } = useSession();
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Si no hay sesión, mostramos botón de login
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
         <button
          onClick={() => signIn('google')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2"
        >
          Login con Google
        </button>
      </div>
    );
  }

  // Función para enviar mensaje
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!msg) return;
    setLoading(true);

    const userEmail = session.user?.name ?? '';
    const res = await fetch(
      `/api/agent?thread_id=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(msg)}`
    );
    const data = await res.json();
    const texto = data.response;

    // Actualizar historial
    setChat((c) => [
      ...c,
      { de: 'usuario', texto: msg },
      { de: 'bot', texto }
    ]);

    setMsg('');
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <span className="font-medium">¡Hola, {session.user?.email}!</span>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-600 hover:underline"
        >
          Cerrar sesión
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {chat.map((m, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg max-w-[80%] ${
              m.de === 'usuario'
                ? 'ml-auto bg-blue-100 text-right'
                : 'mr-auto bg-white shadow-sm border border-gray-200'
            }`}
          >
            {m.de === 'bot' ? (
              <div className="prose prose-sm max-w-none text-left">
                <ReactMarkdown>{m.texto}</ReactMarkdown>
              </div>
            ) : (
              m.texto
            )}
          </div>
        ))}
        
        {loading && (
          <div className="mr-auto bg-white shadow-sm border border-gray-200 p-4 rounded-lg">
            <span className="text-gray-500">Pensando...</span>
          </div>
        )}
      </div>

      <form onSubmit={enviar} className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Escribe tu mensaje…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          disabled={loading}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? '…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
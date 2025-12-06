// src/app/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, FormEvent } from 'react';

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

    const userEmail = session.user?.email ?? '';
    
    try {
        // 1. La llamada (está bien estructurada)
        const res = await fetch(
          `/api/proxy/chat?thread_id=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(msg)}`
          // Nota: Mira el punto B sobre la ruta
        );

        if (!res.ok) throw new Error("Error en el backend");

        // 2. CORRECCIÓN AQUÍ: Parsear JSON
        const data = await res.json(); 
        const textoRespuesta = data.response; // Extraemos solo el mensaje

        // Actualizar historial
        setChat((c) => [
          ...c,
          { de: 'usuario', texto: msg },
          { de: 'bot',     texto: textoRespuesta } // Usamos el texto limpio
        ]);
    } catch (error) {
        console.error(error);
        alert("Hubo un error al conectar con el agente");
    }

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
            className={`p-3 rounded max-w-[70%] ${
              m.de === 'usuario'
                ? 'ml-auto bg-blue-100 text-right'
                : 'mr-auto bg-gray-100'
            }`}
          >
            {m.texto}
          </div>
        ))}
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

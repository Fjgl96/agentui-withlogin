// src/app/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, FormEvent, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Mensaje = { id: string; de: 'usuario' | 'bot'; texto: string };

export default function Page() {
  const { data: session } = useSession();
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const mensajesRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Filtrar solo mensajes del usuario para el historial
  const consultas = chat.filter((m) => m.de === 'usuario');

  // Scroll automático al último mensaje
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  // Navegar a un mensaje específico
  const scrollToMessage = (id: string) => {
    const element = mensajesRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => element.classList.remove('ring-2', 'ring-blue-400'), 1500);
    }
  };

  // Truncar texto largo
  const truncar = (texto: string, max = 30) => 
    texto.length > max ? texto.substring(0, max) + '...' : texto;

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <button
          onClick={() => signIn('google')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg"
        >
          Login con Google
        </button>
      </div>
    );
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setLoading(true);

    const nuevoId = `msg-${Date.now()}`;
    const userEmail = session.user?.email ?? '';

    // Agregar mensaje del usuario inmediatamente
    setChat((c) => [...c, { id: nuevoId, de: 'usuario', texto: msg }]);
    const mensajeEnviado = msg;
    setMsg('');

    try {
      const res = await fetch(
        `/api/agent?thread_id=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(mensajeEnviado)}`
      );
      const data = await res.json();
      const texto = data.response ?? 'Sin respuesta';

      setChat((c) => [...c, { id: `msg-${Date.now()}`, de: 'bot', texto }]);
    } catch {
      setChat((c) => [...c, { id: `msg-${Date.now()}`, de: 'bot', texto: 'Error al conectar.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } bg-neutral-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-neutral-700">
          <h1 className="font-bold text-lg">Finance Buddy</h1>
          <p className="text-sm text-neutral-400 mt-1">Tu asistente financiero</p>
        </div>

        <div className="p-3 border-b border-neutral-700">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold">Historial</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {consultas.length === 0 ? (
            <p className="p-4 text-neutral-500 text-sm">Tus consultas aparecerán aquí</p>
          ) : (
            <ul>
              {consultas.map((c, idx) => (
                <li key={c.id}>
                  <button
                    onClick={() => scrollToMessage(c.id)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition border-b border-neutral-800"
                  >
                    <span className="text-neutral-500 text-xs">#{idx + 1}</span>
                    <p className="text-sm text-neutral-200 mt-1">{truncar(c.texto)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title={sidebarOpen ? 'Ocultar historial' : 'Mostrar historial'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-medium">¡Hola, {session.user?.name}!</span>
          </div>
          <button onClick={() => signOut()} className="text-sm text-gray-600 hover:underline">
            Cerrar sesión
          </button>
        </header>

        {/* Chat */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-xl font-semibold">¿En qué puedo ayudarte hoy?</p>
              <p className="text-sm mt-2">Escribe tu consulta financiera</p>
            </div>
          )}

          {chat.map((m) => (
            <div
              key={m.id}
              ref={(el) => { mensajesRefs.current[m.id] = el; }}
              className={`p-4 rounded-lg max-w-[80%] transition-all duration-300 ${
                m.de === 'usuario'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'mr-auto bg-white shadow-sm border border-gray-200'
              }`}
            >
              {m.de === 'bot' ? (
                <div className="prose prose-sm max-w-none">
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

        {/* Input */}
        <form onSubmit={enviar} className="p-4 bg-white border-t flex gap-2">
          <input
            className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Escribe tu mensaje…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
// src/app/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, FormEvent, useRef, useEffect } from 'react';
import { LoadingMessage } from '@/components/LoadingMessage'; // Asegúrate de importar esto si lo usas
import ReactMarkdown from 'react-markdown';
import { SocialLinks } from '@/components/SocialLinks'; // Asegúrate de importar esto si lo usas

// 1. MODIFICADO: Agregar campo fecha opcional
type Mensaje = { 
  id: string; 
  de: 'usuario' | 'bot'; 
  texto: string; 
  fecha?: string; // <--- NUEVO
};

export default function Page() {
  const { data: session } = useSession();
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  
  // 2. NUEVOS ESTADOS
  const [historyLoaded, setHistoryLoaded] = useState(false); // <--- NUEVO: Control de carga historial
  const [busqueda, setBusqueda] = useState('');              // <--- NUEVO: Estado para el buscador

  const mensajesRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 3. MODIFICADO: Filtro con búsqueda
  const consultas = chat.filter((m) => 
    m.de === 'usuario' && 
    m.texto.toLowerCase().includes(busqueda.toLowerCase()) // <--- NUEVO: Lógica de filtrado
  );

  // 4. NUEVO: Cargar historial al iniciar sesión
  useEffect(() => {
    const fetchHistory = async () => {
      if (session?.user?.email && !historyLoaded) {
        try {
          setLoading(true);
          const res = await fetch(`/api/history?thread_id=${encodeURIComponent(session.user.email)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              setChat(data.messages);
            }
          }
        } catch (error) {
          console.error("Error cargando historial:", error);
        } finally {
          setLoading(false);
          setHistoryLoaded(true);
        }
      }
    };
    fetchHistory();
  }, [session, historyLoaded]);

  // Scroll automático
  useEffect(() => {
    if (chatContainerRef.current && !showScrollBtn) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat, showScrollBtn]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanciaAlFinal = scrollHeight - scrollTop - clientHeight;
    setShowScrollBtn(distanciaAlFinal > 100);
  };

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const copiarTexto = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const scrollToMessage = (id: string) => {
    const element = mensajesRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => element.classList.remove('ring-2', 'ring-blue-400'), 1500);
    }
  };

  const truncar = (texto: string, max = 30) => 
    texto.length > max ? texto.substring(0, max) + '...' : texto;

  // 5. NUEVO: Función para formatear fecha
  const formatearFecha = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-ES', {
      hour: '2-digit', 
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

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
    // Generamos fecha local para mostrar instantáneamente
    const fechaLocal = new Date().toISOString(); 

    setChat((c) => [...c, { id: nuevoId, de: 'usuario', texto: msg, fecha: fechaLocal }]); // <--- Agregamos fecha local
    const mensajeEnviado = msg;
    setMsg('');

    try {
      const res = await fetch(
        `/api/agent?thread_id=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(mensajeEnviado)}`
      );
      const data = await res.json();
      const texto = data.response ?? 'Sin respuesta';
      const fechaRespuesta = new Date().toISOString();

      setChat((c) => [...c, { id: `msg-${Date.now()}`, de: 'bot', texto, fecha: fechaRespuesta }]); // <--- Agregamos fecha respuesta
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

        {/* 6. NUEVO: BUSCADOR EN EL SIDEBAR */}
        <div className="p-3 border-b border-neutral-700">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-2">Historial</h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar consultas..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-neutral-800 text-white text-xs rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 placeholder-neutral-500"
            />
            <div className="absolute right-2 top-2 text-neutral-500 pointer-events-none">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        {/* ---------------------------------- */}

        <div className="flex-1 overflow-y-auto">
          {consultas.length === 0 ? (
            <p className="p-4 text-neutral-500 text-sm">
              {busqueda ? 'No se encontraron resultados' : 'Tus consultas aparecerán aquí'}
            </p>
          ) : (
            <ul>
              {consultas.map((c, idx) => (
                <li key={c.id}>
                  <button
                    onClick={() => scrollToMessage(c.id)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition border-b border-neutral-800"
                  >
                    <span className="text-neutral-500 text-xs">#{idx + 1}</span>
                    <p className="text-sm text-neutral-200 mt-1 break-words line-clamp-2">
                        {truncar(c.texto)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SocialLinks />
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col relative">
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

        <div 
          ref={chatContainerRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
        {chat.length === 0 && (
          // ... (Tu bloque de bienvenida igual que antes) ...
          <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
             <p className="text-gray-700 mb-4">Esta es una calculadora financiera inteligente...</p>
             {/* ... resto del contenido de bienvenida ... */}
          </div>
        )}
          {chat.map((m) => (
            <div
              key={m.id}
              ref={(el) => { mensajesRefs.current[m.id] = el; }}
              className={`group relative p-4 rounded-lg max-w-[80%] transition-all duration-300 ${
                m.de === 'usuario'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'mr-auto bg-white shadow-sm border border-gray-200'
              }`}
            >
              <div className={`flex flex-col ${m.de === 'usuario' ? 'items-end' : 'items-start'}`}>
                
                {/* Contenido del mensaje */}
                <div className="w-full">
                  {m.de === 'bot' ? (
                    <>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{m.texto}</ReactMarkdown>
                      </div>
                      <button
                        onClick={() => copiarTexto(m.id, m.texto)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copiar respuesta"
                      >
                        {/* ... Iconos de copiar ... */}
                        {copiadoId === m.id ? (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                    </>
                  ) : (
                    m.texto
                  )}
                </div>

                {/* 7. NUEVO: FECHA DEBAJO DEL MENSAJE */}
                {m.fecha && (
                  <span className={`text-[10px] mt-1 ${m.de === 'usuario' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatearFecha(m.fecha)}
                  </span>
                )}
                {/* --------------------------------- */}

              </div>
            </div>
          ))}

          {loading && (
             <LoadingMessage /> 
          )}
        </div>

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all"
            title="Ir al final"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

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
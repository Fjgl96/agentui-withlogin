// src/app/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import { LoadingMessage } from '@/components/LoadingMessage';
import ReactMarkdown from 'react-markdown';
import { SocialLinks } from '@/components/SocialLinks';

type Mensaje = { 
  id: string; 
  de: 'usuario' | 'bot'; 
  texto: string; 
  fecha?: string;
};

const MESSAGES_PER_PAGE = 50;

export default function Page() {
  const { data: session } = useSession();
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  
  // Estados de paginación
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  const mensajesRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Filtrar consultas del usuario con búsqueda
  const consultas = chat.filter((m) => 
    m.de === 'usuario' && 
    m.texto.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Invertir orden para mostrar más recientes primero en sidebar
  const consultasInvertidas = [...consultas].reverse();

  // Función para cargar historial con useCallback para evitar recreación
  const fetchHistory = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!session?.user?.email) return;
    
    setLoadingHistory(true);
    
    try {
      const res = await fetch(
        `/api/history?thread_id=${encodeURIComponent(session.user.email)}&limit=${MESSAGES_PER_PAGE}&offset=${offset}`
      );
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.messages && Array.isArray(data.messages)) {
          if (append) {
            // Agregar mensajes más antiguos al inicio
            setChat(prev => [...data.messages, ...prev]);
          } else {
            setChat(data.messages);
          }
          
          // Verificar si hay más mensajes
          setHasMoreHistory(data.messages.length === MESSAGES_PER_PAGE);
          setHistoryOffset(offset + data.messages.length);
        } else {
          setHasMoreHistory(false);
        }
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoadingHistory(false);
      setHistoryLoaded(true);
    }
  }, [session?.user?.email]);

  // Cargar historial inicial
  useEffect(() => {
    if (session?.user?.email && !historyLoaded) {
      fetchHistory(0, false);
    }
  }, [session, historyLoaded, fetchHistory]);

  // Función para cargar más historial
  const loadMoreHistory = () => {
    if (!loadingHistory && hasMoreHistory) {
      fetchHistory(historyOffset, true);
    }
  };

  // Scroll automático al final cuando hay nuevos mensajes
  useEffect(() => {
    if (chatContainerRef.current && !showScrollBtn) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat.length, showScrollBtn]);

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

  const formatearFecha = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-ES', {
      hour: '2-digit', 
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

  // Pantalla de login
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
    const fechaLocal = new Date().toISOString();

    setChat((c) => [...c, { id: nuevoId, de: 'usuario', texto: msg, fecha: fechaLocal }]);
    const mensajeEnviado = msg;
    setMsg('');

    try {
      const res = await fetch(
        `/api/agent?thread_id=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(mensajeEnviado)}`
      );
      const data = await res.json();
      const texto = data.response ?? 'Sin respuesta';
      const fechaRespuesta = new Date().toISOString();

      setChat((c) => [...c, { id: `msg-${Date.now()}`, de: 'bot', texto, fecha: fechaRespuesta }]);
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

        {/* Buscador */}
        <div className="p-3 border-b border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold">Historial</h2>
            <span className="text-xs text-neutral-500">
              {consultas.length} consulta{consultas.length !== 1 ? 's' : ''}
            </span>
          </div>
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

        {/* Lista de consultas (orden inverso: más recientes primero) */}
        <div className="flex-1 overflow-y-auto">
          {loadingHistory && consultas.length === 0 ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-neutral-500 border-t-white rounded-full mx-auto"></div>
              <p className="text-neutral-500 text-sm mt-2">Cargando historial...</p>
            </div>
          ) : consultasInvertidas.length === 0 ? (
            <p className="p-4 text-neutral-500 text-sm">
              {busqueda ? 'No se encontraron resultados' : 'Tus consultas aparecerán aquí'}
            </p>
          ) : (
            <>
              <ul>
                {consultasInvertidas.map((c, idx) => {
                  // Calcular número real (inverso)
                  const numeroReal = consultas.length - idx;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => scrollToMessage(c.id)}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition border-b border-neutral-800"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 text-xs">#{numeroReal}</span>
                          {c.fecha && (
                            <span className="text-neutral-600 text-[10px]">
                              {formatearFecha(c.fecha)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-200 mt-1 break-words line-clamp-2">
                          {truncar(c.texto)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              
              {/* Botón cargar más */}
              {hasMoreHistory && !busqueda && (
                <div className="p-3">
                  <button
                    onClick={loadMoreHistory}
                    disabled={loadingHistory}
                    className="w-full py-2 px-3 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingHistory ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-neutral-500 border-t-white rounded-full"></div>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Cargar consultas anteriores
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
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
          {chat.length === 0 && !loadingHistory && (
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                👋 ¡Bienvenido a Finance Buddy!
              </h2>
              <p className="text-gray-700 mb-4">
                Soy tu asistente financiero inteligente. Puedo ayudarte con:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Cálculos de interés compuesto
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Análisis de inversiones
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Planificación de ahorro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Consultas financieras generales
                </li>
              </ul>
              <p className="text-gray-500 text-sm mt-4">
                Escribe tu primera consulta para comenzar.
              </p>
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
                        {copiadoId === m.id ? (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </>
                  ) : (
                    m.texto
                  )}
                </div>

                {m.fecha && (
                  <span className={`text-[10px] mt-1 ${m.de === 'usuario' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatearFecha(m.fecha)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && <LoadingMessage />}
        </div>

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all animate-fade-in"
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              'Enviar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
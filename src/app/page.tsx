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

type UserMode = 'landing' | 'authenticated' | 'guest';

const MESSAGES_PER_PAGE = 50;

// Generar ID único para invitados
const generateGuestId = () => `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function Page() {
  const { data: session, status } = useSession();
  
  // Estado del modo de usuario
  const [userMode, setUserMode] = useState<UserMode>('landing');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  
  // Estados del chat
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

  // Determinar el thread_id actual
  const getCurrentThreadId = useCallback(() => {
    if (session?.user?.email) return session.user.email;
    if (guestId) return guestId;
    return null;
  }, [session?.user?.email, guestId]);

  // Efecto para manejar cambios de sesión
  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user?.email) {
      setUserMode('authenticated');
      setGuestId(null);
    } else if (guestId) {
      setUserMode('guest');
    } else {
      setUserMode('landing');
    }
  }, [session, status, guestId]);

  // Filtrar consultas del usuario con búsqueda
  const consultas = chat.filter((m) => 
    m.de === 'usuario' && 
    m.texto.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Invertir orden para mostrar más recientes primero en sidebar
  const consultasInvertidas = [...consultas].reverse();

  // Función para cargar historial
  const fetchHistory = useCallback(async (offset: number = 0, append: boolean = false) => {
    const threadId = getCurrentThreadId();
    if (!threadId || threadId.startsWith('guest_')) return;
    
    setLoadingHistory(true);
    
    try {
      const res = await fetch(
        `/api/history?thread_id=${encodeURIComponent(threadId)}&limit=${MESSAGES_PER_PAGE}&offset=${offset}`
      );
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.messages && Array.isArray(data.messages)) {
          if (append) {
            setChat(prev => [...data.messages, ...prev]);
          } else {
            setChat(data.messages);
          }
          
          setHasMoreHistory(data.hasMore ?? data.messages.length === MESSAGES_PER_PAGE);
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
  }, [getCurrentThreadId]);

  // Cargar historial inicial solo para usuarios autenticados
  useEffect(() => {
    if (userMode === 'authenticated' && !historyLoaded) {
      fetchHistory(0, false);
    }
  }, [userMode, historyLoaded, fetchHistory]);

  // Función para cargar más historial
  const loadMoreHistory = () => {
    if (!loadingHistory && hasMoreHistory && userMode === 'authenticated') {
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

  // Handler para iniciar como invitado
  const handleGuestMode = () => {
    setShowGuestWarning(true);
  };

  const confirmGuestMode = () => {
    const newGuestId = generateGuestId();
    setGuestId(newGuestId);
    setUserMode('guest');
    setShowGuestWarning(false);
    setChat([]); // Limpiar chat para invitados
    setHistoryLoaded(true); // No cargar historial para invitados
    setHasMoreHistory(false);
  };

  // Handler para cerrar sesión (invitado o autenticado)
  const handleLogout = () => {
    if (userMode === 'guest') {
      // Mostrar advertencia antes de salir
      if (chat.length > 0) {
        const confirm = window.confirm(
          '⚠️ Al salir perderás todo el historial de esta sesión.\n\n¿Estás seguro que deseas salir?'
        );
        if (!confirm) return;
      }
      setGuestId(null);
      setUserMode('landing');
      setChat([]);
      setHistoryLoaded(false);
    } else {
      signOut();
    }
  };

  // Enviar mensaje
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    
    const threadId = getCurrentThreadId();
    if (!threadId) return;
    
    setLoading(true);

    const nuevoId = `msg-${Date.now()}`;
    const fechaLocal = new Date().toISOString();

    setChat((c) => [...c, { id: nuevoId, de: 'usuario', texto: msg, fecha: fechaLocal }]);
    const mensajeEnviado = msg;
    setMsg('');

    try {
      const res = await fetch(
        `/api/agent?thread_id=${encodeURIComponent(threadId)}&message=${encodeURIComponent(mensajeEnviado)}`
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

  // ==========================================
  // PANTALLA DE LANDING (INICIO)
  // ==========================================
  if (userMode === 'landing' && status !== 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        {/* Modal de advertencia para invitados */}
        {showGuestWarning && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Modo Invitado</h3>
                <p className="text-gray-600 mb-4">
                  Al usar el modo invitado, tu historial de consultas <strong>NO se guardará</strong>. 
                  Cuando cierres el navegador o la sesión, <strong>perderás todas tus conversaciones</strong>.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Recomendación:</strong> Inicia sesión con Google para guardar tu historial y acceder desde cualquier dispositivo.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGuestWarning(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmGuestMode}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  >
                    Continuar sin cuenta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Finance Buddy
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Tu asistente financiero inteligente potenciado por IA para el estudio del CFA
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Cálculos Financieros</h3>
              <p className="text-blue-200 text-sm">VAN, TIR, WACC, CAPM, Black-Scholes y más de 20 herramientas</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Material CFA</h3>
              <p className="text-blue-200 text-sm">Acceso a documentación y explicaciones basadas en el curriculum CFA</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Chat Inteligente</h3>
              <p className="text-blue-200 text-sm">Respuestas contextuales con memoria de conversación</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Comienza ahora
            </h2>
            
            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión con Google
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">o</span>
              </div>
            </div>
            
            <button
              onClick={handleGuestMode}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-xl hover:bg-gray-200 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Continuar como invitado
            </button>
            
            <p className="text-center text-gray-500 text-xs mt-4">
              Los invitados no pueden guardar su historial de consultas
            </p>
          </div>
          
          {/* Footer */}
          <p className="text-center text-blue-300/60 text-sm mt-8">
            Desarrollado con IA avanzada • Material basado en CFA Level I
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA PRINCIPAL DE CHAT
  // ==========================================
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

        {/* Buscador - Solo para usuarios autenticados */}
        {userMode === 'authenticated' && (
          <div className="p-3 border-b border-neutral-800">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar consultas..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-neutral-800 text-sm text-white placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-600"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Historial de consultas */}
        <div className="flex-1 overflow-y-auto">
          {userMode === 'guest' ? (
            <div className="p-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-200 text-sm font-medium">Modo Invitado</p>
                    <p className="text-yellow-200/70 text-xs mt-1">
                      Tu historial no se guardará al cerrar la sesión.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signIn('google')}
                  className="w-full mt-3 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 py-2 rounded transition"
                >
                  Iniciar sesión para guardar
                </button>
              </div>
              
              {/* Mostrar consultas de la sesión actual */}
              {consultas.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-neutral-500 mb-2">Consultas de esta sesión:</p>
                  <ul>
                    {consultasInvertidas.map((c, idx) => {
                      const numeroReal = consultas.length - idx;
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() => scrollToMessage(c.id)}
                            className="w-full text-left px-3 py-2 hover:bg-neutral-800 transition rounded-lg"
                          >
                            <span className="text-neutral-500 text-xs">#{numeroReal}</span>
                            <p className="text-sm text-neutral-300 mt-0.5 truncate">{truncar(c.texto)}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : loadingHistory && consultas.length === 0 ? (
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
              
              {/* Botón cargar más - solo para autenticados */}
              {hasMoreHistory && !busqueda && userMode === 'authenticated' && (
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
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {userMode === 'guest' 
                  ? '¡Hola, Invitado!' 
                  : `¡Hola, ${session?.user?.name}!`
                }
              </span>
              {userMode === 'guest' && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Sin guardar
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline flex items-center gap-1"
          >
            {userMode === 'guest' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </>
            ) : (
              'Cerrar sesión'
            )}
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
                  <span className="text-green-500">✓</span> Cálculos financieros (VAN, TIR, WACC, CAPM...)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Valoración de bonos y opciones
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Análisis de portafolios
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Consultas teóricas del material CFA
                </li>
              </ul>
              <p className="text-gray-500 text-sm mt-4">
                Escribe tu primera consulta para comenzar.
              </p>
              
              {userMode === 'guest' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Modo Invitado:</strong> Tu historial no se guardará. 
                    <button 
                      onClick={() => signIn('google')}
                      className="underline ml-1 hover:text-yellow-900"
                    >
                      Inicia sesión
                    </button> para guardar tus consultas.
                  </p>
                </div>
              )}
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
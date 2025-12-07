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
  const [showScrollBtn, setShowScrollBtn] = useState(false);      // NUEVO
  const [copiadoId, setCopiadoId] = useState<string | null>(null); // NUEVO
  
  const mensajesRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Filtrar solo mensajes del usuario para el historial
  const consultas = chat.filter((m) => m.de === 'usuario');

  // Scroll automático al último mensaje (solo si no scrolleó arriba)
  useEffect(() => {
    if (chatContainerRef.current && !showScrollBtn) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat, showScrollBtn]);

  // NUEVO: Detectar scroll para mostrar/ocultar botón
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanciaAlFinal = scrollHeight - scrollTop - clientHeight;
    setShowScrollBtn(distanciaAlFinal > 100);
  };

  // NUEVO: Scroll hacia abajo
  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  // NUEVO: Copiar al portapapeles
  const copiarTexto = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

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

      {/* Contenido principal - AGREGADO: relative */}
      <div className="flex-1 flex flex-col relative">
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

        {/* Chat - AGREGADO: onScroll */}
        <div 
          ref={chatContainerRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
        {chat.length === 0 && (
          <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-700 mb-4">
              Esta es una calculadora financiera inteligente con acceso a material de estudio. Puedes:
            </p>

            {/* Cálculos financieros */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <span className="text-lg">📊</span> Realizar cálculos financieros (22 herramientas CFA Level I):
              </h3>
              <ul className="ml-6 space-y-1 text-sm text-gray-600">
                <li><strong>Renta Fija:</strong> Valoración de Bonos, Duration, Convexity, Current Yield</li>
                <li><strong>Finanzas Corporativas:</strong> VAN, WACC, TIR, Payback Period, Profitability Index</li>
                <li><strong>Portafolio:</strong> CAPM, Sharpe/Treynor/Jensen, Beta, Retorno, Desviación Estándar</li>
                <li><strong>Equity:</strong> Gordon Growth Model</li>
                <li><strong>Derivados:</strong> Opciones Call/Put (Black-Scholes), Put-Call Parity</li>
              </ul>
            </div>

            {/* Material de estudio */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <span className="text-lg">📚</span> Consultar material de estudio financiero:
              </h3>
              <ul className="ml-6 space-y-1 text-sm text-gray-500 italic">
                <li>{'"¿Qué es el WACC?"'}</li>
                <li>{'"Explica el concepto de Duration"'}</li>
                <li>{'"Busca información sobre el modelo Gordon Growth"'}</li>
              </ul>
            </div>

            {/* Ayuda */}
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <span className="text-lg">❓</span> Obtener ayuda:
              </h3>
              <ul className="ml-6 text-sm text-gray-500 italic">
                <li>{'"Ayuda" o "¿Qué puedes hacer?"'}</li>
              </ul>
            </div>
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
              {m.de === 'bot' ? (
                <>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{m.texto}</ReactMarkdown>
                  </div>
                  {/* NUEVO: Botón copiar */}
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
          ))}

          {/* MODIFICADO: Indicador animado */}
          {loading && (
            <div className="mr-auto bg-white shadow-sm border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* NUEVO: Botón scroll to bottom */}
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
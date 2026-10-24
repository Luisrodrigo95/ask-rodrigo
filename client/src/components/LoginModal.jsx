import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  User, 
  Lock, 
  Terminal, 
  Mail, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  X,
  ArrowRight,
  Cpu,
  Settings
} from 'lucide-react';
import { fetchAuthConfig } from '../services/api';

export function LoginModal({ 
  isOpen, 
  onClose, 
  onGuestLogin, 
  onAdminLogin, 
  onGoogleLogin, 
  currentRole 
}) {
  const [activeTab, setActiveTab] = useState('guest'); // 'guest' | 'admin'
  // NO PRE-FILL: starts completely blank as requested by user
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [customClientId, setCustomClientId] = useState('');
  const [showConfigId, setShowConfigId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleBtnRef = useRef(null);

  // Load auth config (Google Client ID) from backend
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    fetchAuthConfig().then(cfg => {
      if (cfg?.googleClientId) {
        setGoogleClientId(cfg.googleClientId);
      }
    });
  }, [isOpen]);

  // Initialize Google Identity Services when tab is admin and client_id is available
  useEffect(() => {
    if (!isOpen || activeTab !== 'admin') return;

    const clientIdToUse = googleClientId || customClientId;
    if (!clientIdToUse) return;

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientIdToUse,
          callback: async (response) => {
            if (response.credential) {
              setLoading(true);
              setError('');
              try {
                await onGoogleLogin(response.credential);
                onClose();
              } catch (err) {
                setError(err.message || 'Error al autenticar con Google');
              } finally {
                setLoading(false);
              }
            }
          }
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            locale: 'es',
            width: 320
          });
        }
      } catch (err) {
        console.warn('[GSI Init Error]:', err);
      }
    }
  }, [isOpen, activeTab, googleClientId, customClientId]);

  if (!isOpen) return null;

  const handleGuestSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await onGuestLogin();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión de invitado');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPin.trim()) {
      setError('Por favor ingresa tu Gmail y PIN de seguridad.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAdminLogin(adminEmail.trim(), adminPin.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Credenciales de administrador incorrectas');
    } finally {
      setLoading(false);
    }
  };

  // Direct Google OAuth click trigger
  const handleTriggerGoogleOAuth = () => {
    const clientIdToUse = googleClientId || customClientId;

    if (!clientIdToUse) {
      setShowConfigId(true);
      setError('Para autenticar con Google, ingresa tu Google Client ID de Google Cloud Console o utiliza el acceso con PIN de respaldo abajo.');
      return;
    }

    if (window.google?.accounts?.oauth2) {
      setError('');
      setLoading(true);
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientIdToUse,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                await onGoogleLogin(null, tokenResponse.access_token);
                onClose();
              } catch (err) {
                setError(err.message || 'Error verificando cuenta de Google');
              } finally {
                setLoading(false);
              }
            } else if (tokenResponse?.error) {
              setError(`Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`);
              setLoading(false);
            }
          }
        });
        client.requestAccessToken();
      } catch (err) {
        setLoading(false);
        setError('Error iniciando el selector de cuentas de Google: ' + err.message);
      }
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('El servicio de Google Identity aún está cargando. Por favor espera un segundo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button (only if already has a session) */}
        {currentRole && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 text-center relative overflow-hidden bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20 mb-3">
            <Terminal className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Acceso a Ask-Rodrigo
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Selecciona tu modalidad para interactuar con la plataforma.
          </p>

          {/* Toggle Switch */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('guest'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                activeTab === 'guest'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Modo Invitado</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                activeTab === 'admin'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Rodrigo (Google)</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'guest' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Consultas sobre Perfil & Proyectos (Solo Lectura)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ideal para reclutadores, líderes técnicos y clientes. Pregunta libremente sobre:
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Experiencia en <strong>ZAP-Hosting</strong> y 5 años en <strong>Continental</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Estudios en <strong>ITESM</strong> y certificaciones <strong>ITIL / Scrum</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Stack técnico: <strong>Linux, Nginx, Docker, Python, Bash</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Proyectos: <strong>PresWin, therodrigo.com, TotiMigraciones</strong></span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Sin acceso a ejecución de comandos, edición de archivos ni métricas de servidor.</span>
              </div>

              <button
                type="button"
                onClick={handleGuestSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading ? 'Accediendo...' : 'Entrar como Invitado (1 Clic)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Cpu className="w-4 h-4" />
                  <span>Acceso Completo Administrador (Rodrigo)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Autentícate directamente con tu cuenta de Google para acceder a Antigravity CLI, métricas y control del VPS sin limitaciones.
                </p>
              </div>

              {/* 1. DIRECT GOOGLE SIGN-IN BUTTON */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerGoogleOAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs tracking-wide shadow-lg shadow-white/5 transition-all active:scale-[0.99] disabled:opacity-50 border border-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
                </button>

                {/* Render container for official GSI button if available */}
                <div ref={googleBtnRef} className="flex justify-center empty:hidden"></div>
              </div>

              {/* Collapsible Client ID Config for Google OAuth */}
              {showConfigId && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-teal-500/30 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-teal-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      <span>Google OAuth Client ID</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfigId(false)}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Introduce tu Client ID creado en Google Cloud Console para <code>https://therodrigo.com</code>:
                  </p>
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value.trim())}
                    placeholder="xxxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}

              {/* DIVIDER */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    O ingresa con tu correo y PIN
                  </span>
                </div>
              </div>

              {/* 2. DIRECT EMAIL + PIN FORM (BLANK INPUTS, NO PRE-FILL) */}
              <form onSubmit={handleAdminSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span>Correo Gmail:</span>
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Introduce tu Gmail"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    <span>PIN de Seguridad:</span>
                  </label>
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Introduce tu PIN"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{loading ? 'Verificando...' : 'Acceder con PIN'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

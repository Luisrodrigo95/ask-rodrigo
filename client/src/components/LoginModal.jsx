import React, { useState } from 'react';
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
  Cpu
} from 'lucide-react';

export function LoginModal({ isOpen, onClose, onGuestLogin, onAdminLogin, currentRole }) {
  const [activeTab, setActiveTab] = useState('guest'); // 'guest' | 'admin'
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            Selecciona tu modalidad de consulta para interactuar con la plataforma.
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
              <span>Rodrigo (Gmail)</span>
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
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                  <Cpu className="w-4 h-4" />
                  <span>Acceso Completo Administrador (Rodrigo)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conexión directa a Antigravity CLI, ejecución de comandos en el VPS Debian 13, monitoreo en tiempo real y gestión de calendario.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span>Tu Gmail de Administrador:</span>
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="contacto@therodrigo.com o tu@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    <span>PIN de Seguridad / Master Key:</span>
                  </label>
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Introduce el PIN de seguridad"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading ? 'Verificando credenciales...' : 'Ingresar como Rodrigo (Admin)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

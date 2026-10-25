import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Volume2, 
  Shield, 
  Server, 
  Check, 
  X, 
  Cpu, 
  Key,
  ExternalLink,
  Users,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Sparkles,
  Brain
} from 'lucide-react';
import {
  fetchUsers,
  addAuthorizedUser,
  updateUserPermission,
  deleteAuthorizedUser
} from '../services/api.js';

export const SETTINGS_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google DeepMind', badge: 'Recomendado', desc: 'Rápido, multimodal y alta precisión' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', badge: 'Thinking', desc: 'Razonamiento avanzado paso a paso' },
  { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6', provider: 'Anthropic', badge: 'Deep Thinking', desc: 'Máxima profundidad analítica' },
  { id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B', provider: 'Open Source', badge: '120B Medium', desc: 'Modelo abierto de alto desempeño' }
];

export function SettingsModal({
  isOpen,
  onClose,
  currentLanguage,
  onChangeLanguage,
  speechEnabled,
  onToggleSpeech,
  speechRate,
  onChangeSpeechRate,
  googleClientId,
  onSaveGoogleClientId,
  verboseMode,
  onToggleVerboseMode,
  selectedModel = 'gemini-3.8-flash',
  onChangeModel,
  thinkingEffort = 'high',
  onChangeThinkingEffort,
  health,
  currentUser,
  t
}) {
  const [clientIdInput, setClientIdInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // User Management State (Owner Only)
  const isOwner = currentUser?.isOwner || currentUser?.email === 'lg2012garcia@gmail.com';
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newCanEdit, setNewCanEdit] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState(null);
  const [userErrorMsg, setUserErrorMsg] = useState(null);

  const loadUsersList = async () => {
    if (!isOwner) return;
    setLoadingUsers(true);
    try {
      const data = await fetchUsers();
      setUsersList(data.users || []);
    } catch (err) {
      console.warn('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && isOwner) {
      loadUsersList();
    }
  }, [isOpen, isOwner]);

  const handleAddUser = async (e) => {
    e?.preventDefault();
    if (!newUserEmail.trim()) return;
    setUserActionMsg(null);
    setUserErrorMsg(null);
    try {
      const res = await addAuthorizedUser(newUserEmail.trim(), newCanEdit);
      setUserActionMsg(res.message || 'Usuario autorizado correctamente.');
      setNewUserEmail('');
      setNewCanEdit(false);
      loadUsersList();
      setTimeout(() => setUserActionMsg(null), 3500);
    } catch (err) {
      setUserErrorMsg(err.message || 'Error autorizando usuario.');
      setTimeout(() => setUserErrorMsg(null), 4000);
    }
  };

  const handleTogglePermission = async (userEmail, currentCanEdit) => {
    try {
      await updateUserPermission(userEmail, !currentCanEdit);
      setUsersList((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === userEmail.toLowerCase()
            ? { ...u, canEditProjects: !currentCanEdit }
            : u
        )
      );
    } catch (err) {
      setUserErrorMsg(err.message);
      setTimeout(() => setUserErrorMsg(null), 4000);
    }
  };

  const handleDeleteUser = async (userEmail) => {
    if (!window.confirm(st.usersRemoveConfirm || '¿Revocar acceso a este usuario?')) return;
    try {
      await deleteAuthorizedUser(userEmail);
      setUsersList((prev) => prev.filter((u) => u.email.toLowerCase() !== userEmail.toLowerCase()));
    } catch (err) {
      setUserErrorMsg(err.message);
      setTimeout(() => setUserErrorMsg(null), 4000);
    }
  };

  useEffect(() => {
    if (googleClientId) {
      setClientIdInput(googleClientId);
    }
  }, [googleClientId]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSaveGoogleClientId) {
      onSaveGoogleClientId(clientIdInput.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const st = t.settings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn safe-top safe-bottom">
      <div className="relative w-full max-w-xl max-h-[88dvh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80 flex items-center gap-3 bg-gradient-to-b from-slate-800/40 to-transparent shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {st.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {st.subtitle}
            </p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
          {/* 0. AI Model & Thinking Quality Preference */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Modelo de IA y Calidad de Pensamiento</span>
            </div>
            <p className="text-xs text-slate-400">
              Elige el modelo que procesará tus instrucciones en Antigravity CLI y el nivel de esfuerzo de pensamiento (Medium o High).
            </p>

            {/* Model Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {SETTINGS_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeModel && onChangeModel(m.id)}
                    className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/60 ring-1 ring-teal-500/30 shadow-xs'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{m.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-tight">{m.desc}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{m.provider}</span>
                      {isSelected && <span className="text-teal-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Activo</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Thinking Effort Segmented Control */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Calidad de Pensamiento (Thinking Effort)</span>
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  thinkingEffort === 'high' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {thinkingEffort === 'high' ? 'High Reasoning' : 'Medium Reasoning'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeThinkingEffort && onChangeThinkingEffort('medium')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    thinkingEffort === 'medium'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">⚡ Medium</span>
                  <span className="text-[10px] text-slate-400 text-center mt-0.5">Equilibrado y rápido</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeThinkingEffort && onChangeThinkingEffort('high')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    thinkingEffort === 'high'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">🧠 High</span>
                  <span className="text-[10px] text-slate-400 text-center mt-0.5">Razonamiento profundo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80"></div>
          {/* 1. Language Preference */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Globe className="w-4 h-4" />
              <span>{st.langSection}</span>
            </div>
            <p className="text-xs text-slate-400">
              {st.langDesc}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  currentLanguage === 'en'
                    ? 'bg-teal-600/15 border-teal-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">English</p>
                  <p className="text-[11px] text-slate-500">Default</p>
                </div>
                {currentLanguage === 'en' && <Check className="w-4 h-4 text-teal-400" />}
              </button>

              <button
                type="button"
                onClick={() => onChangeLanguage('es')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  currentLanguage === 'es'
                    ? 'bg-teal-600/15 border-teal-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">Español</p>
                  <p className="text-[11px] text-slate-500">Nativo</p>
                </div>
                {currentLanguage === 'es' && <Check className="w-4 h-4 text-teal-400" />}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80"></div>

          {/* 2. Voice & Audio Output */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Volume2 className="w-4 h-4" />
              <span>{st.speechSection}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-300">{st.speechEnableLabel}</span>
              <button
                type="button"
                onClick={onToggleSpeech}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  speechEnabled ? 'bg-teal-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    speechEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {speechEnabled && (
              <div className="pt-1 space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400">
                  {st.speechSpeedLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: st.speedSlow, val: 0.9 },
                    { label: st.speedNormal, val: 1.0 },
                    { label: st.speedFast, val: 1.2 }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onChangeSpeechRate(item.val)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        speechRate === item.val
                          ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80"></div>

          {/* 3. Verbose Mode: Tools & Commands Execution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Terminal className="w-4 h-4" />
              <span>{st.verboseSection}</span>
            </div>
            <p className="text-xs text-slate-400">
              {st.verboseDesc}
            </p>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs text-slate-300 font-medium block">
                  {st.verboseEnableLabel}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {st.verboseEnableSub}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleVerboseMode}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  verboseMode ? 'bg-teal-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    verboseMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80"></div>

          {/* 4. Google OAuth Client ID Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Shield className="w-4 h-4" />
              <span>{st.googleSection}</span>
            </div>
            <p className="text-xs text-slate-400">
              {st.googleDesc}
            </p>
            <div className="space-y-1">
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder={st.googlePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Authorized JavaScript Origin: <code className="text-teal-400">https://therodrigo.com</code>
              </p>
            </div>
          </div>

          {/* 4. Authorized Users & Permissions (Owner Only) */}
          {isOwner && (
            <>
              <div className="border-t border-slate-800/80"></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
                    <Users className="w-4 h-4" />
                    <span>{st.usersSection || 'Gestión de Usuarios (Google OAuth)'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                    Owner Panel
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {st.usersDesc || 'Administra los usuarios autorizados para iniciar sesión con Google. Los colaboradores entran con su Gmail y tienen acceso casi total, con edición de proyectos protegida hasta que tú la autorices.'}
                </p>

                {/* Feedback notifications */}
                {userActionMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{userActionMsg}</span>
                  </div>
                )}
                {userErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{userErrorMsg}</span>
                  </div>
                )}

                {/* Add User Form */}
                <form onSubmit={handleAddUser} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder={st.usersAddEmailPlaceholder || 'nuevo.colaborador@gmail.com'}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono"
                      required
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{st.usersAddBtn || 'Autorizar'}</span>
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newCanEdit}
                      onChange={(e) => setNewCanEdit(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                    />
                    <span>{st.usersCanEditLabel || 'Permitir editar proyectos existentes'}</span>
                  </label>
                </form>

                {/* Users List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto [scrollbar-width:thin] pr-1">
                  {loadingUsers ? (
                    <div className="text-center py-4 text-xs text-slate-500 font-mono">Cargando usuarios...</div>
                  ) : usersList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500 font-mono">No hay usuarios registrados</div>
                  ) : (
                    usersList.map((u) => {
                      const isTargetOwner = u.isOwner || u.email.toLowerCase() === 'lg2012garcia@gmail.com';
                      return (
                        <div
                          key={u.email}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/70 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {u.picture ? (
                              <img src={u.picture} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-semibold text-white">
                                  {u.name || u.email.split('@')[0]}
                                </span>
                                {isTargetOwner ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[9px] font-semibold">
                                    {st.usersOwnerBadge || 'Owner'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px]">
                                    {st.usersCollabBadge || 'Colaborador'}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[10px] text-slate-400 font-mono">
                                {u.email}
                              </p>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle Project Edit Permission */}
                            {!isTargetOwner && (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(u.email, u.canEditProjects)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                  u.canEditProjects
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-white'
                                }`}
                                title={u.canEditProjects ? 'Puede editar proyectos. Clic para revocar edición.' : 'Solo lectura en proyectos. Clic para autorizar edición.'}
                              >
                                {u.canEditProjects ? (
                                  <>
                                    <Unlock className="w-2.5 h-2.5" />
                                    <span>{st.usersCanEditBadge || 'Edición ON'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>{st.usersReadOnlyBadge || 'Solo Lectura'}</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Delete User */}
                            {!isTargetOwner && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.email)}
                                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Revocar acceso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-slate-800/80"></div>

          {/* 4. Infrastructure & Connection Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Server className="w-3.5 h-3.5 text-teal-400" />
                <span>{st.vpsHost}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                Healthy
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Current Session Role:</span>
              <span className="font-semibold text-slate-300">
                {currentUser?.role === 'admin' ? `Admin (${currentUser.email})` : 'Guest Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            {t.calendar.cancel}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition-all active:scale-[0.98]"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>{st.savedToast}</span>
              </>
            ) : (
              <span>{st.saveBtn}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  AlertCircle
} from 'lucide-react';
import {
  fetchUsers,
  addAuthorizedUser,
  updateUserPermission,
  deleteAuthorizedUser
} from '../services/api.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 flex items-center gap-3 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {st.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {st.subtitle}
            </p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
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

          {/* 3. Google OAuth Client ID Configuration */}
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

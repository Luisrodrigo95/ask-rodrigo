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
  ExternalLink
} from 'lucide-react';

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

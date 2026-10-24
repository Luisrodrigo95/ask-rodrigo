import React from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  GraduationCap, 
  ExternalLink, 
  Mail, 
  Phone,
  Server
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, profileData }) {
  if (!isOpen || !profileData) return null;

  const { profile, skills, experience, projects } = profileData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="w-4 h-4 text-teal-400" />
            <span>Perfil Profesional — {profile?.name || 'Luis Rodrigo García'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300">
          {/* Bio & Education */}
          <div className="space-y-2">
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono text-teal-400">
              Resumen Ejecutivo
            </h3>
            <p className="leading-relaxed text-slate-300">{profile?.bio}</p>
            <div className="flex items-center gap-2 pt-1 text-slate-400">
              <GraduationCap className="w-4 h-4 text-teal-400" />
              <span>{profile?.education?.degree} — {profile?.education?.institution}</span>
            </div>
          </div>

          {/* Experience Highlights */}
          {experience && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono text-teal-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Experiencia Laboral</span>
              </h3>
              <div className="space-y-3">
                {experience.map((exp, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{exp.company}</span>
                      <span className="text-[10px] font-mono text-teal-400">{exp.period}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{exp.role} • {exp.location}</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px] pt-1">
                      {exp.highlights?.map((h, hIdx) => (
                        <li key={hIdx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono text-teal-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>Proyectos en Producción</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {projects.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">[{p.status}]</span>
                    </div>
                    <p className="text-slate-400">{p.description}</p>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-400 hover:underline pt-0.5"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Direct */}
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-wrap items-center justify-between gap-3">
            <span className="text-white font-medium">Contacto Directo:</span>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${profile?.contact?.email || 'contacto@therodrigo.com'}`}
                className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-500 flex items-center gap-1 text-[11px]"
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </a>
              <a
                href={profile?.contact?.linkedin || 'https://www.linkedin.com/in/rodrigo-garcia-hernandez/'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1 text-[11px]"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

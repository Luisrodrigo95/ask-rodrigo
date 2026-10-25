import React from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  GraduationCap, 
  ExternalLink, 
  Mail, 
  Server,
  Code2,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import rodrigoIcon from '../assets/rodrigo-icon.png';

// Localized content for Spanish display when language is 'es'
const SPANISH_CONTENT = {
  bio: "Ingeniero en Sistemas Digitales y Robótica especializado en cumplimiento de licencias open-source, virtualización de infraestructura y automatización de servidores de alto rendimiento. Con amplia experiencia auditando plataformas empresariales, desarrollando scripts resilientes y orquestando clusters bare-metal bajo estrictos acuerdos de nivel de servicio (SLAs).",
  degree: "Ingeniería en Sistemas Digitales y Robótica (Titulado)",
  institution: "Instituto Tecnológico y de Estudios Superiores de Monterrey (ITESM)",
  experiences: {
    "ZAP-Hosting": {
      role: "Ingeniero de Soporte Técnico e Infraestructura",
      location: "Remoto — Ciudad de México, MX",
      highlights: [
        "Aprovisionamiento y monitorización de hosting para clientes en dominios, webspaces, VPS y servidores dedicados bare-metal sobre hipervisores Proxmox VE.",
        "Despliegue y optimización de arquitecturas dedicadas para servidores con SteamCMD, optimizando la asignación de recursos multi-instancia.",
        "Configuración de proxies inversos Nginx, certificados SSL (Let's Encrypt) y transferencias seguras SFTP/FTPS con cifrado PGP/GPG.",
        "Análisis de capturas de paquetes con Wireshark (PCAP) para diagnosticar falsos positivos en filtros de mitigación DDoS PletX.",
        "Soporte técnico y resolución de incidencias Nivel 1/Nivel 2 bajo estándares ITIL y estrictos acuerdos de nivel de servicio (SLAs)."
      ]
    },
    "Continental Automotive": {
      role: "Ingeniero de Cumplimiento Open-Source",
      location: "Querétaro, MX",
      highlights: [
        "Auditoría de software empresarial para cumplimiento de licencias open-source con FOSSology, Black Duck Hub y SPDX.",
        "Automatización con Bash/Python e integraciones API; automatización de cargas de trabajo batch con Autosys y Control-M.",
        "Administración de servidores Unix/Linux y contribución a herramienta web interna en AWS (S3, EC2, RDS) para flujos de cumplimiento.",
        "Gestión de sprint planning, backlogs y ceremonias en Jira como Scrum Master para optimizar la previsibilidad de entrega."
      ]
    },
    "Congeladora Niño": {
      role: "Ingeniero de Mantenimiento",
      location: "Irapuato, MX",
      highlights: [
        "Reducción de tiempos de inactividad mediante diagnóstico eficaz y análisis de causa raíz (RCA) de fallas de equipos.",
        "Mantenimiento preventivo y correctivo de PLC, sistemas mecánicos y líneas de refrigeración industrial."
      ]
    }
  },
  projects: {
    "therodrigo.com": "Portfolio interactivo y panel de telemetría en tiempo real sobre VPS Debian 13. Incluye emulación de terminal CLI, gráficas de latencia en vivo con RRDtool y selector de temas.",
    "PresWin": "Plataforma integral de presupuestos de construcción y análisis de precios unitarios con cálculo multimoneda y matrices de costos paramétricos.",
    "TotiMigraciones": "Portal integral para seguimiento y gestión de expedientes de extranjería con servidor de correo dedicado (Postfix/Dovecot).",
    "Appointment Checker": "Demonio en segundo plano de alta disponibilidad que sondea turnos consulares y citas oficiales con alertas instantáneas multicanal.",
    "WiwiShop": "Subproyecto de catálogo de productos e-commerce dedicado a accesorios para mascotas, inspirado en la mascota Wiwi."
  }
};

export function ProfileModal({ isOpen, onClose, profileData, currentLanguage = 'en', t }) {
  if (!isOpen || !profileData) return null;

  const isEs = currentLanguage === 'es';
  const pm = t?.profileModal || {
    title: isEs ? "Perfil Profesional —" : "Professional Profile —",
    executiveSummary: isEs ? "Resumen Ejecutivo" : "Executive Summary",
    education: isEs ? "Educación & Título" : "Education & Degree",
    workExperience: isEs ? "Experiencia Laboral" : "Work Experience",
    projects: isEs ? "Proyectos en Producción" : "Production Projects",
    skills: isEs ? "Habilidades Técnicas & Competencias" : "Technical Skills & Competencies",
    openProject: isEs ? "Abrir" : "Open",
    directContact: isEs ? "Contacto Directo:" : "Direct Contact:",
    email: "Email",
    linkedin: "LinkedIn",
    phone: isEs ? "Teléfono" : "Phone",
    close: isEs ? "Cerrar" : "Close"
  };

  const { profile, skills, experience, projects } = profileData;

  // Localized text resolution
  const resolvedBio = isEs ? (SPANISH_CONTENT.bio || profile?.bio) : profile?.bio;
  const resolvedDegree = isEs ? (SPANISH_CONTENT.degree || profile?.education?.degree) : profile?.education?.degree;
  const resolvedInstitution = isEs ? (SPANISH_CONTENT.institution || profile?.education?.institution) : profile?.education?.institution;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-paper border border-edge rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-edge flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2.5 text-ink font-bold text-sm">
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-edge shrink-0">
              <img src={rodrigoIcon} alt={profile?.name || 'Luis Rodrigo García'} className="w-full h-full object-cover" />
            </div>
            <span>{pm.title} {profile?.name || 'Luis Rodrigo García'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sunken text-muted hover:text-ink transition-colors cursor-pointer"
            title={pm.close}
            aria-label={pm.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-ink/90 [scrollbar-width:thin]">
          {/* Bio & Education */}
          <div className="space-y-3 p-4 rounded-xl bg-panel/60 border border-edge">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden ring-1 ring-edge shadow-md bg-paper p-0.5">
                <img src={rodrigoIcon} alt={profile?.name || 'Luis Rodrigo García'} className="w-full h-full object-cover rounded-[14px]" />
              </div>
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <h3 className="font-semibold uppercase tracking-wider text-[11px] font-mono text-accent">
                  {pm.executiveSummary}
                </h3>
                <p className="leading-relaxed text-[12.5px] text-ink/80">{resolvedBio}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 text-muted text-[11.5px] border-t border-edge/50">
              <GraduationCap className="w-4 h-4 text-accent shrink-0" />
              <span>{resolvedDegree} — {resolvedInstitution}</span>
            </div>
          </div>

          {/* Technical Skills */}
          {skills && (
            <div className="space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-[11px] font-mono text-accent flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>{pm.skills}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.programming?.slice(0, 7).map((s, idx) => (
                  <span key={`p-${idx}`} className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-mono text-[11px]">
                    {s}
                  </span>
                ))}
                {skills.infrastructure?.slice(0, 5).map((s, idx) => (
                  <span key={`i-${idx}`} className="px-2 py-0.5 rounded-md bg-sunken border border-edge text-ink/80 font-mono text-[11px]">
                    {s}
                  </span>
                ))}
                {skills.cloudAndDevOps?.slice(0, 4).map((s, idx) => (
                  <span key={`c-${idx}`} className="px-2 py-0.5 rounded-md bg-sunken border border-edge text-ink/80 font-mono text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience Highlights */}
          {experience && (
            <div className="space-y-3">
              <h3 className="font-semibold uppercase tracking-wider text-[11px] font-mono text-accent flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{pm.workExperience}</span>
              </h3>
              <div className="space-y-2.5">
                {experience.map((exp, idx) => {
                  const spExp = isEs && SPANISH_CONTENT.experiences[exp.company];
                  const resolvedRole = spExp ? spExp.role : exp.role;
                  const resolvedLoc = spExp ? spExp.location : exp.location;
                  const resolvedHighlights = spExp ? spExp.highlights : exp.highlights;

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-panel border border-edge space-y-1.5 shadow-v2-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink text-xs">{exp.company}</span>
                        <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full">{exp.period}</span>
                      </div>
                      <p className="text-[11px] text-muted font-medium">{resolvedRole} • {resolvedLoc}</p>
                      <ul className="list-disc list-inside space-y-1 text-ink/80 text-[11px] pt-1">
                        {resolvedHighlights?.map((h, hIdx) => (
                          <li key={hIdx} className="leading-snug">{h}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects && (
            <div className="space-y-3">
              <h3 className="font-semibold uppercase tracking-wider text-[11px] font-mono text-accent flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>{pm.projects}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {projects.map((p, idx) => {
                  // Find matching localized description by project name key
                  let resolvedDesc = p.description;
                  if (isEs) {
                    for (const [key, val] of Object.entries(SPANISH_CONTENT.projects)) {
                      if (p.name.includes(key)) {
                        resolvedDesc = val;
                        break;
                      }
                    }
                  }

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-panel border border-edge text-[11px] space-y-1.5 shadow-v2-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-ink truncate pr-1">{p.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono shrink-0">[{p.status}]</span>
                        </div>
                        <p className="text-muted leading-relaxed line-clamp-3">{resolvedDesc}</p>
                      </div>
                      <div className="pt-1">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent font-medium hover:underline pt-0.5 cursor-pointer text-[11.5px]"
                        >
                          <span>{pm.openProject}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Direct */}
          <div className="p-3.5 rounded-xl bg-panel border border-edge flex flex-wrap items-center justify-between gap-3 shadow-v2-sm">
            <span className="text-ink font-semibold text-xs">{pm.directContact}</span>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${profile?.contact?.email || 'contacto@therodrigo.com'}`}
                className="px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center gap-1.5 text-[11.5px] transition-colors cursor-pointer shadow-v2-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{pm.email}</span>
              </a>
              <a
                href={profile?.contact?.linkedin || 'https://www.linkedin.com/in/luis-rodrigo-garcia-hernandez-43376678'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sunken text-ink hover:bg-edge/40 border border-edge flex items-center gap-1.5 text-[11.5px] transition-colors cursor-pointer"
              >
                <span>{pm.linkedin}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

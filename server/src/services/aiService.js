import { GoogleGenAI } from '@google/genai';
import { rodrigoKnowledge, getSanitizedPublicKnowledge } from '../data/rodrigoKnowledge.js';
import { inspectInputPrompt, buildHardenedSystemPrompt, sanitizeOutputResponse } from '../security/promptArmor.js';

/**
 * Intelligent local fallback responder when no external LLM API key is configured.
 * Hardened for Guest mode with zero disclosure of private telemetry or internal ports.
 */
function localKnowledgeResponder(userMessage, isGuest = false) {
  const q = userMessage.toLowerCase().trim();
  const isEn = /\b(what|who|where|how|tell|give|projects|experience|skills|contact|resume|cv)\b/i.test(q);

  // Guard 1: Pre-Inference Perimeter Check
  const securityCheck = inspectInputPrompt(userMessage, { role: isGuest ? 'guest' : 'admin' });
  if (!securityCheck.safe) {
    return securityCheck.deflection;
  }

  // 1. ZAP-Hosting Specific Experience
  if (q.includes('zap-hosting') || q.includes('zap hosting') || (q.includes('zap') && (q.includes('experiencia') || q.includes('experience')))) {
    const zap = rodrigoKnowledge.experience[0];
    if (isEn) {
      return `### ⚡ ${zap.company} — ${zap.role} (${zap.period})\n` +
        `*${zap.location}*\n\n` +
        `Rodrigo plays a key role supporting and optimizing client infrastructure under strict **ITIL operational processes** and **SLAs**:\n\n` +
        zap.highlights.map(h => `* ${h}`).join('\n') +
        `\n\n> **Core Impact:** High-reliability virtualization on Proxmox VE, custom Nginx reverse proxy configurations with Let's Encrypt SSL, and packet-level PCAP analysis with Wireshark to diagnose false-positive drops in PletX DDoS filters.`;
    }
    return `### ⚡ ${zap.company} — ${zap.role} (${zap.period})\n` +
      `*${zap.location}*\n\n` +
      `Rodrigo desempeña un papel clave en la infraestructura de clientes bajo estrictos estándares operativos **ITIL** y **SLAs**:\n\n` +
      zap.highlights.map(h => `* ${h}`).join('\n') +
      `\n\n> **Impacto principal:** Despliegue de virtualización de alto rendimiento en Proxmox VE, configuración de reverse proxies Nginx con certificados Let's Encrypt, y análisis profundo de paquetes PCAP con Wireshark para diagnosticar falsos positivos en filtros anti-DDoS PletX.`;
  }

  // 2. Continental Automotive Specific Experience (5 years)
  if (q.includes('continental') || q.includes('5 años') || q.includes('5 anos') || q.includes('5 years')) {
    const cont = rodrigoKnowledge.experience[1];
    if (isEn) {
      return `### 🚗 ${cont.company} — ${cont.role} (${cont.period})\n` +
        `*${cont.location}*\n\n` +
        `Over a tenure of **more than 5 years**, Rodrigo championed open-source compliance and automation for mission-critical automotive software:\n\n` +
        cont.highlights.map(h => `* ${h}`).join('\n') +
        `\n\n> **Key Achievements:** Spearheaded open-source software compliance across extensive enterprise codebases using FOSSology, Black Duck Hub, and SPDX standards. Engineered robust Bash and Python automation pipelines, orchestrated batch enterprise scheduling with Autosys and Control-M, and led cross-functional sprints as **Scrum Master** in Jira.`;
    }
    return `### 🚗 ${cont.company} — ${cont.role} (${cont.period})\n` +
      `*${cont.location}*\n\n` +
      `Durante más de **5 años**, Rodrigo lideró el aseguramiento de cumplimiento de software de código abierto y automatizaciones para sistemas automotrices críticos:\n\n` +
      cont.highlights.map(h => `* ${h}`).join('\n') +
      `\n\n> **Logros destacados:** Auditoría exhaustiva de plataformas empresariales mediante herramientas de análisis profundo (FOSSology, Black Duck Hub y especificaciones SPDX). Desarrolló scripts e integraciones en Bash y Python, administró servidores Unix/Linux, automatizó procesos por lotes con Autosys y Control-M, y coordinó ceremonias ágiles como **Scrum Master** en Jira.`;
  }

  // 3. Studies and Certifications
  if (
    q.includes('estudio') || q.includes('certificacion') || q.includes('certificación') ||
    q.includes('educacion') || q.includes('educación') || q.includes('degree') ||
    q.includes('itesm') || q.includes('universidad') || q.includes('scrum')
  ) {
    const p = rodrigoKnowledge.profile;
    if (isEn) {
      return `### 🎓 Education & Professional Certifications\n\n` +
        `* **Academic Degree:** **${p.education.degree}**\n` +
        `  - *Institution:* **${p.education.institution}** (Tecnológico de Monterrey)\n` +
        `  - *Status:* ${p.education.period}\n\n` +
        `* **Certifications & Operational Methodologies:**\n` +
        `  - **Scrum Master:** Certified and experienced managing Agile sprints, backlogs, and ceremonies in Jira.\n` +
        `  - **ITIL Operational Standards:** Incident management, problem determination, and SLA governance in production infrastructure.\n` +
        `  - **Open-Source Compliance & SPDX:** Certified compliance auditor utilizing FOSSology and Black Duck Hub.\n\n` +
        `* **Languages:**\n` +
        `  - English: Advanced / Professional proficiency\n` +
        `  - Spanish: Native`;
    }
    return `### 🎓 Estudios y Certificaciones de Rodrigo\n\n` +
      `* **Grado Académico:** **${p.education.degree}**\n` +
      `  - *Institución:* **${p.education.institution}** (Tecnológico de Monterrey)\n` +
      `  - *Estado:* Titulado\n\n` +
      `* **Certificaciones y Metodologías Operativas:**\n` +
      `  - **Scrum Master:** Gestión ágil de sprints, backlogs y ceremonias en Jira para maximizar la predictibilidad de entrega.\n` +
      `  - **Estándares Operativos ITIL:** Gestión de incidentes, análisis de causa raíz (RCA) y cumplimiento estricto de SLAs.\n` +
      `  - **Cumplimiento Open-Source & SPDX:** Especialista en auditoría de licencias con FOSSology y Black Duck Hub.\n\n` +
      `* **Idiomas:**\n` +
      `  - Inglés: Nivel Profesional Avanzado\n` +
      `  - Español: Nativo`;
  }

  // 4. Linux, Nginx and Docker Specific Experience
  if (
    (q.includes('linux') && (q.includes('nginx') || q.includes('docker'))) ||
    q.includes('nginx y docker') || q.includes('linux y nginx')
  ) {
    if (isEn) {
      return `### 🐧 Rodrigo's Experience with Linux, Nginx, and Docker\n\n` +
        `Rodrigo possesses extensive, daily hands-on experience orchestrating production environments with these core technologies:\n\n` +
        `* **Debian & Ubuntu Linux (Advanced Administration):**\n` +
        `  - Manages bare-metal and VPS instances on Debian 13 (Trixie) and Ubuntu Server.\n` +
        `  - Proficient in systemd daemons, journalctl logging, nftables/iptables firewall rules, and kernel-level performance tuning.\n` +
        `  - Expert in automation scripting with Bash and Python for backup, monitoring, and health checks.\n\n` +
        `* **Nginx (High-Performance Reverse Proxy & Web Server):**\n` +
        `  - Configures reverse proxies with HTTP/2, Let's Encrypt automated SSL/TLS renewal, and OCSP stapling.\n` +
        `  - Specializes in SSE (Server-Sent Events) and WebSocket streaming setups with zero-buffering (\`X-Accel-Buffering: no\`).\n` +
        `  - Implements multi-domain virtual hosts, client caching headers, and rate limiting.\n\n` +
        `* **Docker & Container Orchestration:**\n` +
        `  - Containerizes web applications and background services with Docker and Docker Compose.\n` +
        `  - Manages isolated networks, volume persistence, and environment secrets.`;
    }
    return `### 🐧 Experiencia de Rodrigo con Linux, Nginx y Docker\n\n` +
      `Rodrigo cuenta con amplia experiencia práctica y diaria administrando estos pilares en servidores de producción:\n\n` +
      `* **Linux (Debian & Ubuntu a Nivel Avanzado):**\n` +
      `  - Administra instancias físicas y VPS bajo Debian 13 (Trixie) y Ubuntu Server con kernel moderno 6.12.\n` +
      `  - Gestión experta de servicios systemd, logs con journalctl, cortafuegos con nftables/iptables y hardening de seguridad.\n` +
      `  - Creación de scripts automatizados en Bash y Python para backups, monitoreo y recuperación ante fallos.\n\n` +
      `* **Nginx (Reverse Proxy de Alto Rendimiento y Servidor Web):**\n` +
      `  - Configuración de reverse proxies con HTTP/2, terminación SSL/TLS automatizada con Let's Encrypt y gramática de proxy avanzada.\n` +
      `  - Optimización de streaming SSE (Server-Sent Events) y WebSockets sin buffering (\`X-Accel-Buffering: no\`) para AGy-cli y apps interactivas.\n` +
      `  - Manejo de múltiples virtual hosts, compresión gzip, políticas de caché estático y mitigación de tráfico abusivo.\n\n` +
      `* **Docker y Contenedores:**\n` +
      `  - Despliegue y aislamiento de microservicios mediante Docker y Docker Compose.\n` +
      `  - Configuración de redes internas bridged, persistencia de volúmenes y gestión segura de variables de entorno.`;
  }

  // 5. Tech Stack and Languages
  if (
    q.includes('stack') || q.includes('lenguaje') || q.includes('domina') ||
    q.includes('tecnologia') || q.includes('tecnología') || q.includes('skill') ||
    q.includes('habilidad') || q.includes('tools')
  ) {
    const s = rodrigoKnowledge.skills;
    if (isEn) {
      return `### 🛠️ Technical Stack & Languages\n\n` +
        `* **Languages & Scripting:** ${s.programming.join(' · ')}\n` +
        `* **Infrastructure & Virtualization:** ${s.infrastructure.join(' · ')}\n` +
        `* **Networking & Security:** ${s.networking.join(' · ')}\n` +
        `* **Cloud & DevOps:** ${s.cloudAndDevOps.join(' · ')}\n` +
        `* **Methodologies:** ${s.methodologies.join(' · ')}\n\n` +
        `*Rodrigo emphasizes robust scripting (Bash/Python) combined with Linux system internals, high-availability Nginx proxying, and proactive observability.*`;
    }
    return `### 🛠️ Stack Tecnológico y Lenguajes que Domina Rodrigo\n\n` +
      `* **Lenguajes y Scripting:** ${s.programming.join(' · ')}\n` +
      `* **Infraestructura y Virtualización:** ${s.infrastructure.join(' · ')}\n` +
      `* **Redes y Seguridad:** ${s.networking.join(' · ')}\n` +
      `* **Cloud y DevOps:** ${s.cloudAndDevOps.join(' · ')}\n` +
      `* **Metodologías:** ${s.methodologies.join(' · ')}\n\n` +
      `*El fuerte de Rodrigo radica en la integración de scripting avanzado (Bash/Python) con la administración profunda de Linux, reverse proxies Nginx y arquitecturas resilientes.*`;
  }

  // 6. VPS Infrastructure Configuration
  if (
    q.includes('vps') || q.includes('infraestructura') || q.includes('servidor') ||
    q.includes('hardware') || q.includes('stingray') || q.includes('specs') || q.includes('debian 13')
  ) {
    const pubData = getSanitizedPublicKnowledge();
    const vps = pubData.infrastructure.vps;
    const wrk = pubData.infrastructure.workstation;

    if (isEn) {
      return `### 🖥️ Rodrigo's Cloud Infrastructure & Automation Architecture\n\n` +
        `**Hardened Production VPS:**\n` +
        `* **Operating System:** ${vps.os} (${vps.specs})\n` +
        `* **Virtualization:** ${vps.architecture} via ${vps.provider}\n` +
        `* **Security & Network Perimeter:** ${vps.securityModel}\n` +
        `* **Process Orchestration:** ${vps.management}\n` +
        `* **Hosted Production Platforms:**\n` +
        `  - **therodrigo.com:** Personal portfolio & live systems telemetry\n` +
        `  - **PresWin Suite:** Parametric construction cost estimation platform\n` +
        `  - **TotiMigraciones:** Immigration legal portal & Postfix/Dovecot mail server\n` +
        `  - **Ask-Rodrigo:** Authenticated AGy-cli agent bridge & public knowledge AI\n` +
        `  - **Appointment Checker:** High-availability background polling daemon\n\n` +
        `**🤖 AI Automation & Model Context Protocol (MCP):**\n` +
        `* Multi-node server fleet automated via **Model Context Protocol (MCP)** custom tool servers.\n` +
        `* Demonstrates automated agent management across heterogeneous nodes (e.g. the **Costalito** node) running diagnostic scripts, security checks, and service orchestration safely through authenticated agent channels.`;
    }
    return `### 🖥️ Infraestructura Cloud y Arquitectura de Automatización de Rodrigo\n\n` +
      `**VPS en Producción (Entorno Hardened):**\n` +
      `* **Sistema Operativo:** ${vps.os} (${vps.specs})\n` +
      `* **Virtualización:** ${vps.architecture} en ${vps.provider}\n` +
      `* **Perímetro de Seguridad:** ${vps.securityModel}\n` +
      `* **Orquestación de Procesos:** ${vps.management}\n` +
      `* **Plataformas en Producción:**\n` +
      `  - **therodrigo.com:** Portafolio personal y telemetría de sistemas\n` +
      `  - **PresWin:** Suite de cálculo de costos de construcción\n` +
      `  - **TotiMigraciones:** Portal de trámites de extranjería y correo Postfix/Dovecot\n` +
      `  - **Ask-Rodrigo:** Puente seguro de Antigravity CLI e IA técnica\n` +
      `  - **Appointment Checker:** Demonio de monitoreo continuo de citas consulares\n\n` +
      `**🤖 Automatización con IA y Model Context Protocol (MCP):**\n` +
      `* Flota de servidores multi-nodo automatizada mediante servidores de herramientas personalizadas bajo el estándar **Model Context Protocol (MCP)**.\n` +
      `* Rodrigo implementa agentes autónomos que gestionan y diagnostican nodos heterogéneos (como el nodo **Costalito**) ejecutando tareas de telemetría y despliegue a través de canales autenticados y protegidos.`;
  }

  // 7. General Experience Overview
  if (q.includes('experiencia') || q.includes('trayectoria') || q.includes('trabajo') || q.includes('career')) {
    const jobs = rodrigoKnowledge.experience.map(j => (
      `* **${j.company}** — *${j.role}* (${j.period})\n  ${j.highlights.slice(0, 2).map(h => `- ${h}`).join('\n  ')}`
    )).join('\n\n');

    return (isEn ? `### 💼 Rodrigo's Career Overview\n\n${jobs}\n\nFeel free to ask for deep details about his work at ZAP-Hosting or Continental Automotive!`
                 : `### 💼 Resumen de la Trayectoria de Rodrigo\n\n${jobs}\n\n¡Puedes preguntarme en detalle sobre su experiencia en ZAP-Hosting o Continental Automotive!`);
  }

  // 8. Projects Overview
  if (q.includes('proyecto') || q.includes('project') || q.includes('preswin') || q.includes('wiwishop')) {
    const pList = rodrigoKnowledge.projects.map(p => (
      `* **${p.name}** [${p.status}]\n  - *Stack:* ${p.stack}\n  - *Resumen:* ${p.description}\n  - *Enlace:* ${p.url}`
    )).join('\n\n');

    return (isEn ? `### 🚀 Production Projects Portfolio\n\n${pList}`
                 : `### 🚀 Portafolio de Proyectos en Producción\n\n${pList}`);
  }

  // 9. Contact
  if (q.includes('contacto') || q.includes('contact') || q.includes('email') || q.includes('correo') || q.includes('linkedin')) {
    const c = rodrigoKnowledge.profile.contact;
    return `### 📬 Contacto Directo con Rodrigo\n\n` +
      `* **Email:** [${c.email}](mailto:${c.email})\n` +
      `* **LinkedIn:** [Perfil Oficial en LinkedIn](${c.linkedin})\n` +
      `* **WhatsApp:** [${c.phone}](${c.whatsapp})\n` +
      `* **Portafolio:** [${c.website}](${c.website})`;
  }

  // 10. Default Friendly Overview
  return isEn
    ? `I am here to tell you everything about **Luis Rodrigo García Hernández**!\n\n` +
      `Here are recommended questions you can ask:\n` +
      `* **What is Rodrigo's experience at ZAP-Hosting?**\n` +
      `* **What did Rodrigo accomplish during his 5 years at Continental Automotive?**\n` +
      `* **What degrees and certifications does Rodrigo have?**\n` +
      `* **What technical stack and languages does Rodrigo master?**\n` +
      `* **How is his VPS server infrastructure configured?**\n` +
      `* **Does Rodrigo have experience with Linux, Nginx, and Docker?**`
    : `¡Hola! Conozco en detalle la trayectoria, habilidades y proyectos de **Luis Rodrigo García Hernández**.\n\n` +
      `Aquí tienes algunas preguntas recomendadas que puedes hacerme:\n` +
      `* **¿Cuál es la experiencia de Rodrigo en ZAP-Hosting?**\n` +
      `* **¿Qué hizo Rodrigo durante sus 5 años en Continental Automotive?**\n` +
      `* **¿Qué estudios y certificaciones tiene Rodrigo?**\n` +
      `* **¿Qué stack tecnológico y lenguajes domina Rodrigo?**\n` +
      `* **¿Cómo está configurada su infraestructura de servidores VPS?**\n` +
      `* **¿Tiene experiencia con Linux, Nginx y Docker?**`;
}

/**
 * Generate chat response using configured LLM or fallback knowledge engine
 */
export async function generateChatResponse(message, history = [], options = {}) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
  const isGuest = options.isGuest !== false;

  // Guard 1: Pre-Inference Perimeter
  const securityCheck = inspectInputPrompt(message, { role: isGuest ? 'guest' : 'admin' });
  if (!securityCheck.safe) {
    return {
      reply: securityCheck.deflection,
      engine: 'Tri-Guard Defense (Blocked)',
      intercepted: true,
      timestamp: new Date().toISOString()
    };
  }

  // Guard 2: In-Context Hardened Boundary
  const hardenedPrompt = buildHardenedSystemPrompt(getSanitizedPublicKnowledge());

  if (geminiApiKey && geminiApiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contents = [];

      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.sender === 'user' || turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text || turn.content || '' }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: hardenedPrompt,
          temperature: 0.5,
          maxOutputTokens: 1000
        }
      });

      // Guard 3: Post-Inference DLP Output Sanitization
      const cleanReply = sanitizeOutputResponse(response.text);

      return {
        reply: cleanReply,
        engine: `Gemini (${modelName}) [Tri-Guard Secured]`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[AI Service Warning]: Gemini call failed, using local knowledge engine:', error.message);
      const fallbackReply = localKnowledgeResponder(message, isGuest);
      return {
        reply: sanitizeOutputResponse(fallbackReply),
        engine: 'Knowledge AI (Modo Invitado) [Tri-Guard Secured]',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Zero-Config Local Knowledge Engine
  const localReply = localKnowledgeResponder(message, isGuest);
  return {
    reply: sanitizeOutputResponse(localReply),
    engine: isGuest ? 'Knowledge AI (Modo Invitado) [Tri-Guard Secured]' : 'Knowledge AI (Base Local)',
    timestamp: new Date().toISOString()
  };
}

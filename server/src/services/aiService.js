import { GoogleGenAI } from '@google/genai';
import { rodrigoKnowledge } from '../data/rodrigoKnowledge.js';

// System prompt grounding the assistant
const SYSTEM_PROMPT = `
You are "Ask-Rodrigo", the official AI representative and technical assistant for Luis Rodrigo García Hernández.
Your goal is to answer questions from recruiters, engineering managers, clients, and developers about Rodrigo's professional experience, technical skills, production projects, infrastructure, and contact information.

Key Persona & Guidelines:
1. Persona: Professional, technically sharp, articulate, transparent, and approachable. Speak proudly but humbly about Rodrigo's achievements.
2. Language: Automatically detect and respond in the same language as the user (Spanish or English).
3. Accuracy: Base your answers on the verified knowledge base provided below. Do not fabricate experience, companies, or credentials not mentioned in the knowledge base.
4. Formatting: Use clean Markdown (bullet points, bold highlights, code blocks when discussing commands/architectures) for readability.
5. Action-Oriented: When asked about hiring or contacting Rodrigo, always provide his direct contact channels (contacto@therodrigo.com, LinkedIn, WhatsApp).

Knowledge Base:
${JSON.stringify(rodrigoKnowledge, null, 2)}
`;

/**
 * Intelligent local fallback responder when no external LLM API key is configured.
 */
function localKnowledgeResponder(userMessage) {
  const q = userMessage.toLowerCase().trim();
  const isEn = /\b(what|who|where|how|tell|give|projects|experience|skills|contact|resume|cv)\b/i.test(q);

  // 1. Who is Rodrigo / Profile / Bio
  if (
    q.includes('quien es') || q.includes('quién es') || q.includes('sobre rodrigo') ||
    q.includes('who is') || q.includes('about rodrigo') || q.includes('profile') || q.includes('presentacion')
  ) {
    if (isEn) {
      return `**${rodrigoKnowledge.profile.name}** is a **${rodrigoKnowledge.profile.role}** and graduated with a **${rodrigoKnowledge.profile.education.degree}** from **${rodrigoKnowledge.profile.education.institution}**.\n\n` +
        `> ${rodrigoKnowledge.profile.bio}\n\n` +
        `* **Location:** ${rodrigoKnowledge.profile.location}\n` +
        `* **Languages:** ${rodrigoKnowledge.profile.languages.join(' · ')}\n` +
        `* **Primary Focus:** High-availability server virtualization, open-source compliance auditing, and production automation.`;
    }
    return `**${rodrigoKnowledge.profile.name}** es un **${rodrigoKnowledge.profile.role}**, graduado de **${rodrigoKnowledge.profile.education.degree}** por el **${rodrigoKnowledge.profile.education.institution}**.\n\n` +
      `> ${rodrigoKnowledge.profile.bio}\n\n` +
      `* **Ubicación:** ${rodrigoKnowledge.profile.location}\n` +
      `* **Idiomas:** ${rodrigoKnowledge.profile.languages.join(' · ')}\n` +
      `* **Enfoque principal:** Virtualización de alta disponibilidad, auditorías de cumplimiento open-source y automatización en entornos de producción.`;
  }

  // 2. Experience / ZAP-Hosting / Continental
  if (
    q.includes('experiencia') || q.includes('trayectoria') || q.includes('trabajado') ||
    q.includes('experience') || q.includes('career') || q.includes('zap-hosting') ||
    q.includes('continental') || q.includes('history')
  ) {
    if (q.includes('zap')) {
      const zap = rodrigoKnowledge.experience[0];
      return `### ⚡ ${zap.company} — ${zap.role} (${zap.period})\n` +
        `*${zap.location}*\n\n` +
        zap.highlights.map(h => `* ${h}`).join('\n') +
        `\n\n*Rodrigo gestiona infraestructura de clientes bajo estrictos SLAs y procesos ITIL.*`;
    }
    if (q.includes('continental')) {
      const cont = rodrigoKnowledge.experience[1];
      return `### 🚗 ${cont.company} — ${cont.role} (${cont.period})\n` +
        `*${cont.location}*\n\n` +
        cont.highlights.map(h => `* ${h}`).join('\n') +
        `\n\n*Durante más de 5 años lideró iniciativas de licenciamiento open-source (SPDX, FOSSology, Black Duck) y automatizaciones Bash/Python.*`;
    }

    // Full career overview
    const jobs = rodrigoKnowledge.experience.map(j => (
      `* **${j.company}** — *${j.role}* (${j.period})\n  ${j.highlights.slice(0, 2).map(h => `- ${h}`).join('\n  ')}`
    )).join('\n\n');

    return (isEn ? `### Rodrigo's Career Timeline\n\n${jobs}\n\nAsk me about any specific role for more details!`
                 : `### Trayectoria Profesional de Rodrigo\n\n${jobs}\n\n¡Puedes preguntarme en detalle sobre cualquiera de estas empresas!`);
  }

  // 3. Technical Skills / Stack
  if (
    q.includes('skill') || q.includes('habilidad') || q.includes('stack') ||
    q.includes('tecnologia') || q.includes('tecnología') || q.includes('lenguaje') ||
    q.includes('python') || q.includes('bash') || q.includes('linux') || q.includes('docker')
  ) {
    const s = rodrigoKnowledge.skills;
    return (isEn ? `### 🛠️ Technical Stack & Capabilities\n\n` : `### 🛠️ Stack Tecnológico y Habilidades\n\n`) +
      `* **Programming & Scripting:** ${s.programming.join(', ')}\n` +
      `* **Networking & Security:** ${s.networking.join(', ')}\n` +
      `* **Infrastructure & Virtualization:** ${s.infrastructure.join(', ')}\n` +
      `* **Cloud & Tools:** ${s.cloudAndDevOps.join(', ')}\n` +
      `* **Methodologies:** ${s.methodologies.join(', ')}`;
  }

  // 4. Projects
  if (
    q.includes('proyecto') || q.includes('project') || q.includes('portfolio') ||
    q.includes('preswin') || q.includes('totimigracion') || q.includes('appointment') ||
    q.includes('wiwishop') || q.includes('inspection')
  ) {
    const pList = rodrigoKnowledge.projects.map(p => (
      `* **${p.name}** [${p.status}]\n  - *Stack:* ${p.stack}\n  - *Resumen:* ${p.description}\n  - *Enlace:* ${p.url}`
    )).join('\n\n');

    return (isEn ? `### 🚀 Production Projects Portfolio\n\n${pList}`
                 : `### 🚀 Portafolio de Proyectos en Producción\n\n${pList}`);
  }

  // 5. Infrastructure / Hardware / Servers
  if (
    q.includes('servidor') || q.includes('vps') || q.includes('infraestructura') ||
    q.includes('hardware') || q.includes('server') || q.includes('desktop') ||
    q.includes('debian') || q.includes('stingray') || q.includes('ryzen')
  ) {
    const vps = rodrigoKnowledge.infrastructure.vps;
    const pc = rodrigoKnowledge.infrastructure.desktopPC;
    return `### 🖥️ Infraestructura y Equipamiento\n\n` +
      `**VPS en Producción (${vps.hostname}):**\n` +
      `* **Proveedor:** ${vps.provider} (Debian 13 Trixie x86_64)\n` +
      `* **Recursos:** ${vps.specs} con hypervisor ${vps.hypervisor}\n` +
      `* **Servicios activos:** ${vps.services}\n\n` +
      `**Estación de Trabajo (${pc.name}):**\n` +
      `* **CPU:** ${pc.cpu} | **GPU:** ${pc.gpu}\n` +
      `* **RAM:** ${pc.ram} | **Almacenamiento:** ${pc.storage}`;
  }

  // 6. Contact / Hire / LinkedIn / Email
  if (
    q.includes('contacto') || q.includes('contact') || q.includes('email') ||
    q.includes('correo') || q.includes('telefono') || q.includes('teléfono') ||
    q.includes('linkedin') || q.includes('contratar') || q.includes('hire') ||
    q.includes('whatsapp')
  ) {
    const c = rodrigoKnowledge.profile.contact;
    return (isEn ? `### 📬 Get in Touch with Rodrigo\n\n` : `### 📬 Contacta a Rodrigo\n\n`) +
      `Rodrigo está disponible para oportunidades profesionales y consultas técnicas:\n\n` +
      `* **Email:** [${c.email}](mailto:${c.email})\n` +
      `* **LinkedIn:** [Perfil en LinkedIn](${c.linkedin})\n` +
      `* **WhatsApp / Teléfono:** [${c.phone}](${c.whatsapp})\n` +
      `* **Portafolio Oficial:** [${c.website}](${c.website})`;
  }

  // 7. General fallback
  if (isEn) {
    return `I can help you explore everything about **Luis Rodrigo García Hernández**!\n\n` +
      `Here are some topics you can ask me about:\n` +
      `* **Career & Roles:** His work at ZAP-Hosting and 5 years at Continental Automotive.\n` +
      `* **Technical Skills:** Linux (Debian/Ubuntu), Proxmox, Bash, Python, Nginx, Docker, Wireshark.\n` +
      `* **Projects:** PresWin, therodrigo.com, Appointment Checker, and Industrial Work Order Suite.\n` +
      `* **Contact Information:** Email, LinkedIn, and direct messaging channels.`;
  }

  return `¡Hola! Conozco en detalle la trayectoria, habilidades y proyectos de **Luis Rodrigo García Hernández**.\n\n` +
    `Puedes preguntarme sobre:\n` +
    `* **Experiencia laboral:** Su trabajo actual en ZAP-Hosting o sus 5 años en Continental Automotive.\n` +
    `* **Habilidades técnicas:** Linux (Debian 13), Proxmox VE, Bash, Python, Nginx, Docker, análisis PCAP con Wireshark.\n` +
    `* **Proyectos en producción:** PresWin, therodrigo.com, Appointment Checker y suites de inspección industrial.\n` +
    `* **Contacto y contratación:** Correo electrónico, LinkedIn y disponibilidad.`;
}

/**
 * Generate chat response using configured LLM or fallback knowledge engine
 */
export async function generateChatResponse(message, history = []) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

  if (geminiApiKey && geminiApiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      // Build conversation turns
      const contents = [];
      
      // Add previous turns
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.sender === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
        });
      }

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.6,
          maxOutputTokens: 1000
        }
      });

      return {
        reply: response.text,
        engine: `Gemini (${modelName})`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AI Service Error]: Gemini API call failed, reverting to local engine:', error.message);
      // Fallback gracefully if API quota, network, or key fails
      const fallbackReply = localKnowledgeResponder(message);
      return {
        reply: fallbackReply,
        engine: 'Local Knowledge Engine (Fallback)',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Default: Instant Local Knowledge Reasoning Engine
  const localReply = localKnowledgeResponder(message);
  return {
    reply: localReply,
    engine: 'Local Knowledge Engine (Zero-Config Active)',
    timestamp: new Date().toISOString()
  };
}

// Knowledge base for Luis Rodrigo García Hernández
export const rodrigoKnowledge = {
  profile: {
    name: "Luis Rodrigo García Hernández",
    preferredName: "Rodrigo García",
    handle: "rodrigo@therodrigo.com:~$",
    role: "Technical Support Specialist & Infrastructure / Open-Source Engineer",
    title: "Digital Systems & Robotics Engineer",
    education: {
      degree: "B.S. in Digital Systems & Robotics Engineering",
      institution: "Instituto Tecnológico y de Estudios Superiores de Monterrey (ITESM)",
      period: "Graduated"
    },
    bio: "Digital Systems and Robotics Engineer specializing in open-source software compliance, infrastructure virtualization, and high-performance server automation. Proven track record auditing enterprise platforms, developing resilient script logic, and orchestrating bare-metal clusters under strict SLA requirements.",
    languages: ["English (Advanced / Professional)", "Spanish (Native)"],
    location: "Mexico City / Querétaro, Mexico",
    contact: {
      email: "contacto@therodrigo.com",
      website: "https://therodrigo.com",
      linkedin: "https://www.linkedin.com/in/luis-rodrigo-garcia-hernandez-43376678",
      phone: "+52 442 169 4805",
      whatsapp: "https://wa.me/524421694805"
    }
  },

  skills: {
    programming: ["Bash", "Python", "Node.js", "JavaScript", "PowerShell", "SQL", "C++ (native bot hooks)"],
    networking: ["Nginx (reverse proxy, HTTP/2, SSL)", "Wireshark (PCAP analysis)", "PGP/GPG encryption", "SFTP/FTPS", "nftables", "Netplan", "DNS / Cloudflare", "DDoS mitigation & PletX analysis"],
    infrastructure: ["Debian / Ubuntu Linux", "Proxmox VE / KVM hypervisors", "Docker Containers", "PM2 process manager", "Bare-metal & VPS orchestration", "Systemd daemon management"],
    cloudAndDevOps: ["AWS (S3, EC2, RDS)", "Git & GitHub", "GitHub Actions CI/CD", "Jira & Agile / Scrum (Scrum Master)", "FOSSology", "Black Duck Hub", "SPDX open-source auditing", "Autosys", "Control-M"],
    aiAndAutomation: [
      "Model Context Protocol (MCP) server integration & tooling",
      "Antigravity CLI (AGy) agent orchestration on Linux/Windows VPS",
      "Multi-node MCP bridge management (e.g., Costalito Windows/Linux fleet)",
      "Tri-Guard Prompt Defense & adversarial red-teaming",
      "Automated CI/CD security scanning & deployment pipelines"
    ],
    securityAndHardening: [
      "STRIDE threat modeling & risk mitigation mapping",
      "Linux VPS hardening (nftables, SSH keys, non-root daemons, systemd sandboxing)",
      "Role-Based Access Control (RBAC) & least privilege",
      "Prompt Injection defense & Data Loss Prevention (DLP)",
      "Reverse proxy header hardening & TLS 1.3 encryption"
    ],
    methodologies: ["ITIL operational standards", "SLA management", "Root Cause Analysis (RCA)", "Agile / Scrum framework"]
  },

  experience: [
    {
      company: "ZAP-Hosting",
      role: "Technical Support & Infrastructure Engineer",
      period: "Nov 2025 – Present",
      location: "Remote — Mexico City, MX",
      current: true,
      highlights: [
        "Provision and monitor client hosting across domains, webspaces, VPS and bare-metal dedicated blades on Proxmox VE hypervisors.",
        "Deploy and fine-tune dedicated game server architectures with SteamCMD, optimizing multi-instance resource allocation.",
        "Configure Nginx reverse proxies, SSL certificates (Let's Encrypt), and secure SFTP/FTPS file transfers with PGP/GPG encryption.",
        "Analyze packet captures using Wireshark (PCAP) to diagnose false-positive connection drops in PletX DDoS mitigation filters.",
        "Deliver Tier-1/Tier-2 Application Support and infrastructure troubleshooting adhering to ITIL operational processes under strict SLAs."
      ]
    },
    {
      company: "Continental Automotive",
      role: "Open-Source Compliance Engineer",
      period: "Nov 2019 – Jan 2025",
      location: "Querétaro, MX",
      current: false,
      highlights: [
        "Audited enterprise software for open-source license compliance with FOSSology, Black Duck Hub and SPDX.",
        "Built Bash/Python automation and API integrations; automated batch workloads with Autosys and Control-M.",
        "Administered Unix/Linux servers and contributed to an internal AWS (S3, EC2, RDS) web tool for compliance workflows.",
        "Managed sprint planning, backlogs, and ceremonies in Jira as Scrum Master to increase delivery predictability."
      ]
    },
    {
      company: "Congeladora Niño",
      role: "Maintenance Engineer",
      period: "Mar 2019 – Oct 2019",
      location: "Irapuato, MX",
      current: false,
      highlights: [
        "Cut downtime through efficient troubleshooting and root-cause analysis of equipment failures.",
        "Maintained and repaired complex electrical and electro-mechanical equipment."
      ]
    }
  ],

  projects: [
    {
      name: "therodrigo.com (Personal Portfolio & Systems Telemetry)",
      url: "https://therodrigo.com",
      status: "Production",
      stack: "Node.js (Express 5), EJS, Vanilla CSS/JS, RRDtool telemetry, Nginx",
      description: "Interactive portfolio and live telemetry dashboard running on Debian 13 VPS. Includes CLI terminal emulation, live latency graphing via RRDtool, and multi-theme switcher."
    },
    {
      name: "PresWin — Construction Cost Estimating Suite",
      url: "https://therodrigo.com/preswin",
      status: "Production",
      stack: "Node.js, Express, Nginx reverse proxy, Port 4000",
      description: "Comprehensive construction budgeting and unit price estimation platform with multi-currency calculations and parametric cost matrices."
    },
    {
      name: "TotiMigraciones — Immigration Services Portal",
      url: "https://totimigracion.es",
      status: "Production",
      stack: "Systemd service, Node.js/Express, Nginx, Port 3001, Postfix/Dovecot mail stack",
      description: "Full portal for legal immigration tracking and case management with dedicated mail server integration."
    },
    {
      name: "Appointment Checker Daemon",
      url: "Internal / Port 8090",
      status: "Production",
      stack: "Python background daemon, systemd, HTTP/2 Nginx proxy",
      description: "High-availability background daemon polling consular and official appointment slots with instant multi-channel alerting."
    },
    {
      name: "Technical Inspection & Work Order Suite",
      url: "https://therodrigo.com/technical-inspection",
      status: "Production",
      stack: "Node.js, Express, JD Edwards CAM integration",
      description: "Industrial asset inspection system supporting sequential multi-stage handoffs (MEC/ELEC/CAI) and plant shutdown punch lists."
    },
    {
      name: "WiwiShop",
      url: "https://therodrigo.com/wiwishop",
      status: "Production",
      stack: "JavaScript, HTML5/CSS3, responsive catalog",
      description: "E-commerce product catalog subproject dedicated to pet accessories, inspired by mascot Wiwi."
    }
  ],

  infrastructure: {
    vps: {
      provider: "ZAP-Hosting",
      os: "Debian 13 (Trixie) x86_64",
      kernel: "6.12.101+deb13-amd64",
      specs: "4 vCPUs, 8 GB RAM, 25 GB SSD",
      hostname: "white-stingray-87538",
      hypervisor: "Proxmox VE / KVM",
      services: "Nginx reverse proxy, Node.js PM2, Postfix/Dovecot, Roundcube, Docker"
    },
    desktopPC: {
      name: "STINGRAY-DESKTOP",
      cpu: "AMD Ryzen 9 7900X3D",
      ram: "64GB DDR5 RAM",
      gpu: "AMD Radeon RX 7900XTX",
      storage: "1TB NVMe SSD",
      motherboard: "Gigabyte B650 (rev. 1.1)",
      cooler: "ASUS ROG RYUO III 360 ARGB (White)",
      case: "Asus TUF Gaming GT501 RGB (White)"
    },
    vpsFleet: [
      { id: "NODE-WIN-01", name: "Miffy", os: "Windows Server 2019" },
      { id: "NODE-WIN-02", name: "Mapple", os: "Windows Server 2019" },
      { id: "NODE-WIN-03", name: "Lana", os: "Windows Server 2019" },
      { id: "NODE-WIN-04", name: "Costalito", os: "Windows Server" }
    ]
  },

  personal: {
    pets: [
      { name: "Wiwi", kind: "Cat", note: "Mascot and inspiration for Wiwi Shop" },
      { name: "Memo", kind: "Cat", note: "Chief treat taster" },
      { name: "Pomeranian", kind: "Dog", note: "Family pet" }
    ],
    hobbies: [
      "High-performance server multi-instancing",
      "Game server performance optimization and tuning",
      "Automated scripting frameworks & background daemons",
      "Linux homelab experimentation"
    ]
  },

  suggestions: [
    {
      category: "Trayectoria & Experiencia",
      questions: [
        "¿Cuál es la experiencia de Rodrigo en ZAP-Hosting?",
        "¿Qué hizo Rodrigo durante sus 5 años en Continental Automotive?",
        "¿Qué estudios y certificaciones tiene Rodrigo?"
      ]
    },
    {
      category: "Tecnologías & Infraestructura",
      questions: [
        "¿Qué stack tecnológico y lenguajes domina Rodrigo?",
        "¿Cómo está configurada su infraestructura de servidores VPS?",
        "¿Tiene experiencia con Linux, Nginx y Docker?"
      ]
    },
    {
      category: "Proyectos en Producción",
      questions: [
        "Cuéntame sobre PresWin y therodrigo.com",
        "¿Qué es el Appointment Checker y cómo funciona?",
        "¿Qué proyectos industriales o de compliance ha desarrollado?"
      ]
    },
    {
      category: "Contacto & Disponibilidad",
      questions: [
        "¿Cómo puedo contactar a Rodrigo para una oferta laboral?",
        "¿Está abierto a oportunidades remotas?",
        "¿Cuáles son sus datos de contacto directo?"
      ]
    }
  ]
};

/**
 * Hardened, sanitized public projection of Rodrigo's knowledge base.
 * Guarantees zero leakage of internal port bindings, raw server hostnames,
 * private IPs, or internal process topologies to public guests.
 */
export function getSanitizedPublicKnowledge() {
  return {
    profile: rodrigoKnowledge.profile,
    skills: rodrigoKnowledge.skills,
    experience: rodrigoKnowledge.experience,
    projects: rodrigoKnowledge.projects.map(p => ({
      name: p.name,
      url: p.url.startsWith('http') ? p.url : 'Internal Hardened Daemon',
      status: p.status,
      // Strip internal port references for guest hardening
      stack: p.stack.replace(/,?\s*Port\s*\d+/gi, '').trim(),
      description: p.description
    })),
    infrastructure: {
      vps: {
        provider: "ZAP-Hosting",
        os: "Debian 13 (Trixie) Linux x86_64",
        specs: "4 vCPUs, 8 GB RAM, 25 GB SSD",
        architecture: "Hardened Linux Production Node with Proxmox VE KVM virtualization",
        securityModel: "Zero public service exposure; all traffic proxied through Nginx with TLS 1.3 and HSTS",
        management: "Process orchestration via PM2 and systemd sandboxing"
      },
      workstation: {
        type: "High-Performance Engineering Workstation",
        capabilities: "Multi-instance container virtualization, parallel LLM agent orchestration, and C++/Rust compilation"
      },
      automationFleet: [
        {
          role: "Distributed Node Fleet Automation",
          description: "Multi-server fleet (including Linux & Windows nodes such as the Costalito node) automated and monitored via Model Context Protocol (MCP) custom tool servers and Antigravity agents."
        }
      ]
    },
    personal: rodrigoKnowledge.personal,
    suggestions: rodrigoKnowledge.suggestions
  };
}

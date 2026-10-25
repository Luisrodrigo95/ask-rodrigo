import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let cachedMetrics = null;
let lastMetricsFetchTime = 0;
const METRICS_CACHE_TTL = 5000; // 5 seconds cache to avoid subprocess thrashing

function getAccurateMemory() {
  const totalMem = os.totalmem();
  let availableMem = os.freemem();

  try {
    if (fs.existsSync('/proc/meminfo')) {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
      const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/i);
      if (match && match[1]) {
        availableMem = parseInt(match[1], 10) * 1024;
      }
    }
  } catch {}

  const usedMem = Math.max(0, totalMem - availableMem);
  return {
    totalMb: Math.round(totalMem / 1024 / 1024),
    usedMb: Math.round(usedMem / 1024 / 1024),
    freeMb: Math.round(availableMem / 1024 / 1024),
    usedPercent: Math.min(100, Math.max(0, Math.round((usedMem / totalMem) * 100)))
  };
}

/**
 * Gathers comprehensive VPS performance and services status.
 */
export async function getSystemMetrics() {
  const now = Date.now();
  if (cachedMetrics && (now - lastMetricsFetchTime < METRICS_CACHE_TTL)) {
    return cachedMetrics;
  }

  const cpus = os.cpus();
  const memory = getAccurateMemory();
  const loadavg = os.loadavg();

  // 1. Check systemd services
  const targetServices = [
    { name: 'totimigraciones', label: 'TotiMigraciones Portal (Port 3001)' },
    { name: 'nginx', label: 'Nginx Web Server / Reverse Proxy' },
    { name: 'php8.4-fpm', label: 'PHP 8.4-FPM (Roundcube Webmail)' },
    { name: 'postfix', label: 'Postfix Mail Transfer Agent' },
    { name: 'dovecot', label: 'Dovecot IMAP/POP3 Server' }
  ];

  const services = [];
  for (const s of targetServices) {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${s.name} 2>/dev/null || true`);
      const status = stdout.trim();
      services.push({
        name: s.name,
        label: s.label,
        status: status === 'active' ? 'active' : 'inactive',
        ok: status === 'active'
      });
    } catch {
      services.push({
        name: s.name,
        label: s.label,
        status: 'unknown',
        ok: false
      });
    }
  }

  // 2. Check PM2 processes
  let pm2Processes = [];
  try {
    const { stdout } = await execAsync('sudo -n pm2 jlist 2>/dev/null || pm2 jlist 2>/dev/null || true');
    if (stdout && stdout.trim().startsWith('[')) {
      const parsed = JSON.parse(stdout.trim());
      pm2Processes = parsed.map((p) => ({
        id: p.pm_id,
        name: p.name,
        status: (p.pm2_env && p.pm2_env.status) || 'unknown',
        memoryMb: p.monit ? Math.round(p.monit.memory / 1024 / 1024) : 0,
        cpu: p.monit ? p.monit.cpu : 0,
        restarts: (p.pm2_env && p.pm2_env.restart_time) || 0
      }));
    }
  } catch (errPm2) {
    console.warn('[Metrics] PM2 check warning:', errPm2.message);
  }

  // 3. Disk space
  let disk = { totalGb: '0', usedGb: '0', freeGb: '0', percent: '0%' };
  try {
    const { stdout } = await execAsync('df -k / | tail -n 1');
    const parts = stdout.trim().split(/\s+/);
    if (parts.length >= 5) {
      disk = {
        totalGb: (parseInt(parts[1], 10) / 1024 / 1024).toFixed(1),
        usedGb: (parseInt(parts[2], 10) / 1024 / 1024).toFixed(1),
        freeGb: (parseInt(parts[3], 10) / 1024 / 1024).toFixed(1),
        percent: parts[4]
      };
    }
  } catch (errDisk) {
    console.warn('[Metrics] Disk check warning:', errDisk.message);
  }

  const result = {
    timestamp: new Date().toISOString(),
    os: {
      platform: os.platform(),
      distro: 'Debian 13 Trixie (x86_64)',
      hostname: os.hostname(),
      uptimeHours: (os.uptime() / 3600).toFixed(1)
    },
    cpu: {
      model: cpus.length ? cpus[0].model : 'AMD / Intel Virtual CPU',
      cores: cpus.length,
      loadavg: {
        '1m': loadavg[0].toFixed(2),
        '5m': loadavg[1].toFixed(2),
        '15m': loadavg[2].toFixed(2)
      }
    },
    memory,
    disk,
    services,
    pm2Processes
  };

  cachedMetrics = result;
  lastMetricsFetchTime = Date.now();
  return result;
}

const os = require('os');
const pidusage = require('pidusage');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "uptime",
  version: "1.0.3",
  hasPermssion: 0,
  credits: "selov",
  description: "check bot uptime and system stats",
  commandCategory: "utility",
  usages: "uptime",
  cooldowns: 5
};

function byte2mb(bytes) {
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let l = 0, n = parseInt(bytes, 10) || 0;
  while (n >= 1024 && ++l) n = n / 1024;
  return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`;
}

function timeFormat(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let parts = [];
  
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (secs >= 0) parts.push(`${secs} second${secs > 1 ? 's' : ''}`);

  return parts.join(', ');
}

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    // Store start time in a JSON file (persists across restarts on platforms like Railway)
    const startTimePath = path.join(__dirname, 'data', 'startTime.json');
    
    let startTime;
    
    // Try to read existing start time
    if (fs.existsSync(startTimePath)) {
      const data = JSON.parse(fs.readFileSync(startTimePath, 'utf8'));
      startTime = data.startTime;
    } else {
      // First run, save current time
      startTime = Date.now();
      const dir = path.dirname(startTimePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(startTimePath, JSON.stringify({ startTime }));
    }
    
    // If startTime is older than process.uptime suggests (meaning bot restarted)
    const processUptimeMs = process.uptime() * 1000;
    const processStartTime = Date.now() - processUptimeMs;
    
    if (processStartTime > startTime + 5000) {
      // Bot restarted, update start time
      startTime = processStartTime;
      fs.writeFileSync(startTimePath, JSON.stringify({ startTime }));
    }
    
    const currentTime = Date.now();
    const totalSeconds = Math.floor((currentTime - startTime) / 1000);
    
    // Format uptime like online.html
    const uptimeString = timeFormat(totalSeconds);

    // System stats
    const usage = await pidusage(process.pid);
    
    const osInfo = {
      platform: os.platform(),
      architecture: os.arch()
    };

    const timeStart = Date.now();
    const ping = Date.now() - timeStart;

    const returnResult = `⏱️ BOT UPTIME\n━━━━━━━━━━━━━━━━\n\n` +
      `🕒 ${uptimeString}\n\n` +
      `💻 SYSTEM STATS\n` +
      `❖ CPU Usage: ${usage.cpu.toFixed(1)}%\n` +
      `❖ RAM Usage: ${byte2mb(usage.memory)}\n` +
      `❖ CPU Cores: ${os.cpus().length}\n` +
      `❖ Ping: ${ping}ms\n` +
      `❖ OS: ${osInfo.platform}\n` +
      `❖ Architecture: ${osInfo.architecture}\n\n` +
      `━━━━━━━━━━━━━━━━`;

    api.sendMessage(returnResult, threadID, messageID);

  } catch (err) {
    console.error(err);
    
    // Fallback: use process.uptime() if file read fails
    try {
      const totalSeconds = Math.floor(process.uptime());
      const uptimeString = timeFormat(totalSeconds);
      
      api.sendMessage(
        `⏱️ BOT UPTIME\n━━━━━━━━━━━━━━━━\n\n🕒 ${uptimeString}\n\n⚠️ Full stats unavailable: ${err.message}`,
        threadID,
        messageID
      );
    } catch (fallbackErr) {
      api.sendMessage(
        `❌ Error: ${err.message}`,
        threadID,
        messageID
      );
    }
  }
};

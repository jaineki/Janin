export const meta = {
  name: 'uptime',
  aliases: ['up', 'runtime', 'online'],
  version: '2.0.0',
  author: 'selov',
  description: 'Check how long the bot has been running (matches online.html)',
  guide: ['/uptime'],
  cooldown: 3,
  type: 'anyone',
  category: 'utility'
};

// Store bot start time in seconds (same format as online.html)
if (!global.botStartTimeSeconds) {
  global.botStartTimeSeconds = Math.floor(Date.now() / 1000);
}

function timeFormat(currentTime) {
  const days = Math.floor(currentTime / (3600 * 24));
  const hours = Math.floor((currentTime % (3600 * 24)) / 3600);
  const minutes = Math.floor((currentTime % 3600) / 60);
  const seconds = currentTime % 60;

  let timeFormat = '';

  if (days > 0) {
    timeFormat += `${days} day${days > 1 ? 's' : ''} `;
  }
  if (hours > 0) {
    timeFormat += `${hours} hour${hours > 1 ? 's' : ''} `;
  }
  if (minutes > 0) {
    timeFormat += `${minutes} minute${minutes > 1 ? 's' : ''} `;
  }
  // Always show seconds
  timeFormat += `${seconds} second${seconds > 1 ? 's' : ''}`;

  return timeFormat.trim();
}

export async function onStart({ response }) {
  // Calculate current uptime in seconds
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  const uptimeSeconds = currentTimeSeconds - global.botStartTimeSeconds;

  const formattedUptime = timeFormat(uptimeSeconds);

  const message = `⏱️ Bot Uptime\n━━━━━━━━━━━━━━━━\n` +
                  `${formattedUptime}\n` +
                  `━━━━━━━━━━━━━━━━\n` +
                  `📅 Started: ${new Date(global.botStartTimeSeconds * 1000).toLocaleString()}`;

  await response.reply(message, { parse_mode: 'Markdown' });
}

module.exports.config = {
  name: "uptime",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Displays the bot's uptime",
  commandCategory: "utility",
  usages: "uptime",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, Utils }) {
  const { threadID, messageID } = event;

  try {
    const botID = await api.getCurrentUserID();
    const botAccount = Utils.account.get(botID);
    
    let timeInSeconds = 0;
    
    if (botAccount) {
      timeInSeconds = botAccount.time;
    } else {
      const history = JSON.parse(require('fs').readFileSync('./data/history.json', 'utf-8'));
      const botData = history.find(user => user.userid === botID);
      timeInSeconds = botData ? botData.time : 0;
    }

    const days = Math.floor(timeInSeconds / 86400);
    const hours = Math.floor((timeInSeconds % 86400) / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    let uptimeMessage = "⏱️ Bot Uptime: ";

    if (days > 0) uptimeMessage += `${days} day${days === 1 ? '' : 's'} `;
    if (hours > 0) uptimeMessage += `${hours} hour${hours === 1 ? '' : 's'} `;
    if (minutes > 0) uptimeMessage += `${minutes} minute${minutes === 1 ? '' : 's'} `;
    uptimeMessage += `${seconds} second${seconds === 1 ? '' : 's'}.`;

    api.sendMessage(uptimeMessage, threadID, messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

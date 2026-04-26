const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "donate",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "support the bot by donating via GCash",
  commandCategory: "utility",
  usages: "donate",
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID, senderID } = event;

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Fixed QR code image URL and local path logic
    const qrUrl = "https://i.ibb.co/gMjZ1Vwb/GCash-My-QR-25042026215040-PNG.jpg";
    const qrPath = path.join(__dirname, "cache", "gcash_qr.jpg");

    const donateMessage = `💙 DONATE TO IMPROVE THE BOT\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Hey ${senderName}! 👋\n\n` +
      `Your support helps keep this bot running 24/7!\n\n` +
      `🔹 Server & hosting\n` +
      `🔹 API services\n` +
      `🔹 New features\n` +
      `🔹 Maintenance\n\n` +
      `📱 GCASH DETAILS:\n` +
      `👤 Name: JU***Y B.\n` +
      `📞 Mobile: +63 991 774 1567\n\n` +
      `👇 Scan the QR code below to donate:`;

    // Ensure cache directory exists
    if (!fs.existsSync(path.join(__dirname, "cache"))) {
      fs.mkdirSync(path.join(__dirname, "cache"));
    }

    // Download image if it doesn't exist locally
    if (!fs.existsSync(qrPath)) {
      const response = await axios.get(qrUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(qrPath, Buffer.from(response.data, 'binary'));
    }

    // Send QR image
    await api.sendMessage(
      {
        body: donateMessage,
        attachment: fs.createReadStream(qrPath)
      },
      threadID,
      messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage(
      `❌ Error: ${err.message}\n\n📱 GCASH DETAILS:\n👤 Name: JU***Y B.\n📞 Mobile: +63 991 774 1567`,
      threadID,
      messageID
    );
  }
};

const axios = require("axios");

module.exports.config = {
  name: "feedback",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Send feedback or suggestions to the bot admin",
  commandCategory: "utility",
  usages: "feedback <name> | <message>",
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const input = args.join(" ").trim();

  if (!input) {
    return api.sendMessage(
      "📝 FEEDBACK\n━━━━━━━━━━━━━━━━\n\n" +
      "Send your feedback or suggestions!\n\n" +
      "Usage: feedback <name> | <message>\n\n" +
      "Examples:\n" +
      "• feedback Juan | Add more game commands\n" +
      "• feedback Maria | Fix the ai command\n" +
      "• feedback Pedro | The bot is amazing\n\n" +
      "Note: Use | to separate name and message",
      threadID,
      messageID
    );
  }

  // Parse name and message
  let name = "";
  let message = "";

  if (input.includes("|")) {
    const parts = input.split("|");
    name = parts[0].trim();
    message = parts.slice(1).join("|").trim();
  } else {
    // If no pipe, use whole input as message and auto-detect name
    message = input;
  }

  if (!message) {
    return api.sendMessage(
      "❌ Please enter a message.\n\nFormat: feedback <name> | <message>",
      threadID,
      messageID
    );
  }

  try {
    // Get sender info for fallback name
    let senderName = name || "Anonymous";
    if (!name) {
      try {
        const user = await api.getUserInfo(senderID);
        senderName = user[senderID]?.name || "Anonymous";
      } catch (e) {}
    }

    // Send processing message
    const processingMsg = await api.sendMessage(
      "📤 Sending your feedback... Please wait.",
      threadID
    );

    // POST request to feedback API
    const apiUrl = "https://selovsuggestion.onrender.com/";
    
    const response = await axios.post(apiUrl, {
      name: senderName,
      message: message,
      uid: senderID,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    // Success
    let resultMessage = "✅ FEEDBACK SENT\n━━━━━━━━━━━━━━━━\n\n";
    resultMessage += `👤 From: ${senderName}\n`;
    resultMessage += `🆔 UID: ${senderID}\n`;
    resultMessage += `💬 Message: "${message}"\n\n`;
    resultMessage += "━━━━━━━━━━━━━━━━\n";
    resultMessage += "🙏 Thank you for your feedback!\n";
    resultMessage += "Your input helps improve the bot. 💙";

    await api.editMessage(resultMessage, processingMsg.messageID, threadID);

  } catch (err) {
    console.error("Feedback Error:", err.message);
    
    // If API is down, save locally
    try {
      const fs = require("fs");
      const path = require("path");
      
      const senderName = name || "Anonymous";
      
      const dataDir = path.join(__dirname, "..", "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      
      const feedbackFile = path.join(dataDir, "feedbacks.json");
      let feedbacks = [];
      
      if (fs.existsSync(feedbackFile)) {
        feedbacks = JSON.parse(fs.readFileSync(feedbackFile, "utf8"));
      }
      
      feedbacks.push({
        name: senderName,
        message: message,
        uid: senderID,
        timestamp: new Date().toISOString()
      });
      
      fs.writeFileSync(feedbackFile, JSON.stringify(feedbacks, null, 2));
      
      api.sendMessage(
        "⚠️ Feedback server is offline.\n\n" +
        `👤 From: ${senderName}\n` +
        `💬 Message: "${message}"\n\n` +
        "Your feedback has been saved locally.\n" +
        "It will be sent when the server is back.\n\n" +
        "Thank you! 💙",
        threadID,
        messageID
      );
    } catch (saveErr) {
      api.sendMessage(
        `❌ Error: ${err.message}\n\nPlease try again later.`,
        threadID,
        messageID
      );
    }
  }
};

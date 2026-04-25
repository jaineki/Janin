const axios = require("axios");

module.exports.config = {
  name: "feedback",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "send feedback to the bot admin",
  commandCategory: "utility",
  usages: "feedback <your message>",
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const message = args.join(" ").trim();

  if (!message) {
    return api.sendMessage(
      "📝 FEEDBACK\n━━━━━━━━━━━━━━━━\n\n" +
      "Send your feedback or suggestions!\n\n" +
      "Usage: feedback <your message>\n\n" +
      "Example:\n" +
      "• feedback add more game commands\n" +
      "• feedback the bot is amazing\n" +
      "• feedback fix the weather command",
      threadID,
      messageID
    );
  }

  try {
    // Get sender info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "Unknown User";

    // Send processing message
    const processingMsg = await api.sendMessage(
      "📤 Sending your feedback... Please wait.",
      threadID
    );

    // Send feedback to API
    const apiUrl = `https://pasayloakomego.onrender.com/api/feedback?action=submit&type=feedback&message=${encodeURIComponent(message)}&uid=${senderID}&name=${encodeURIComponent(senderName)}`;
    
    const response = await axios.get(apiUrl);
    const data = response.data;

    // Build success message
    let resultMessage = `✅ FEEDBACK SENT\n━━━━━━━━━━━━━━━━\n\n`;
    resultMessage += `👤 From: ${senderName}\n`;
    resultMessage += `🆔 UID: ${senderID}\n`;
    resultMessage += `💬 Message: ${message}\n\n`;
    resultMessage += `━━━━━━━━━━━━━━━━\n`;
    resultMessage += `🙏 Thank you for your feedback!\n`;
    resultMessage += `Your input helps improve the bot. THIS FEEDBACK IS GOING TO OWNER API`;

    // Edit the processing message with the result
    await api.editMessage(
      resultMessage,
      processingMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage(
      `❌ Failed to send feedback:\n${err.message}\n\nPlease try again later.`,
      threadID,
      messageID
    );
  }
};

module.exports.config = {
  name: "unsend",
  version: "1.0.0",
  role: 0,
  hasPrefix: true,
  aliases: ['unsent', 'remove', 'rm', 'delete'],
  usage: 'Reply to a bot message with "unsend"',
  description: "Remove bot's sent messages",
  credits: "selov",
  cooldown: 2
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, type, messageReply } = event;

  try {
    // Check if user replied to a message
    if (type !== "message_reply") {
      return api.sendMessage(
        "❌ Please reply to the bot message you want to unsend.", 
        threadID, 
        messageID
      );
    }

    // Check if the replied message is from the bot
    if (messageReply.senderID !== api.getCurrentUserID()) {
      return api.sendMessage(
        "❌ I can only unsend my own messages.", 
        threadID, 
        messageID
      );
    }

    // Attempt to unsend the message
    api.unsendMessage(messageReply.messageID, (err) => {
      if (err) {
        console.error("Unsend Error:", err);
        return api.sendMessage(
          "❌ Failed to unsend the message. It might be too old or already deleted.", 
          threadID, 
          messageID
        );
      }
      
      // Optional: Send a quick reaction instead of a message
      api.setMessageReaction("✅", messageID, (err) => {}, true);
      
      // Alternative: Send a small confirmation that auto-deletes
      // Uncomment below if you want a visible confirmation
      /*
      api.sendMessage("✅ Message unsent successfully!", threadID, (err, info) => {
        setTimeout(() => {
          api.unsendMessage(info.messageID);
        }, 2000);
      });
      */
    });

  } catch (err) {
    console.error("Unsend Command Error:", err);
    return api.sendMessage(
      `❌ Error: ${err.message}`, 
      threadID, 
      messageID
    );
  }
};

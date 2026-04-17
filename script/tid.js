module.exports.config = {
  name: "tid",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "View thread ID of current group chat",
  commandCategory: "system",
  usages: "tid",
  cooldowns: 1
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    // Get thread info for more details
    const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
    
    let threadName = "Unknown";
    if (threadInfo) {
      threadName = threadInfo.threadName || "Unnamed Group";
    }

    // Prepare message
    const message = 
      `🆔 **THREAD INFORMATION**\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**Group Name:** ${threadName}\n` +
      `**Thread ID:** ${threadID}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `💡 Use this ID for:\n` +
      `• Adding to support group\n` +
      `• Bot configuration\n` +
      `• Admin commands`;

    api.sendMessage(message, threadID, messageID);

  } catch (err) {
    console.error("TID Command Error:", err);
    
    // Simple fallback if thread info fails
    api.sendMessage(
      `🆔 **Thread ID:** ${threadID}\n\n` +
      `(Could not fetch group name)`,
      threadID,
      messageID
    );
  }
};

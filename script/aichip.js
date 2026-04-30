const axios = require("axios");

module.exports.config = {
  name: "aichip",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI chat with video/image analysis support",
  commandCategory: "ai",
  usages: "/aichip <question> or reply to video/image with /aichip <question>",
  cooldowns: 5
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply, attachments } = event;

  try {
    let prompt = args.join(" ").trim();
    let mediaUrl = null;
    let mediaType = null;

    // Get user info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";
    const firstName = senderName.split(" ")[0];

    // CASE 1: Check if replied to a message with media
    if (messageReply) {
      const repliedAttachment = messageReply.attachments?.[0];
      
      if (repliedAttachment) {
        if (repliedAttachment.type === "video") {
          mediaUrl = repliedAttachment.url;
          mediaType = "video";
        } else if (repliedAttachment.type === "photo") {
          mediaUrl = repliedAttachment.url;
          mediaType = "image";
        } else if (repliedAttachment.type === "animated_image") {
          mediaUrl = repliedAttachment.url;
          mediaType = "gif";
        }
      }
    }

    // CASE 2: Check if the command message itself has media
    if (!mediaUrl && attachments && attachments.length > 0) {
      const firstAttachment = attachments[0];
      
      if (firstAttachment.type === "video") {
        mediaUrl = firstAttachment.url;
        mediaType = "video";
      } else if (firstAttachment.type === "photo") {
        mediaUrl = firstAttachment.url;
        mediaType = "image";
      } else if (firstAttachment.type === "animated_image") {
        mediaUrl = firstAttachment.url;
        mediaType = "gif";
      }
    }

    // If no prompt provided
    if (!prompt) {
      if (mediaUrl) {
        prompt = `Describe this ${mediaType} in detail`;
      } else {
        return api.sendMessage(
          "🤖 AI CHIP - MULTI MODE\n━━━━━━━━━━━━━━━━\n\n" +
          "📝 TEXT CHAT:\n" +
          "/aichip <your question>\n" +
          "Example: /aichip what model are you?\n\n" +
          "📹 VIDEO/IMAGE ANALYSIS:\n" +
          "1. Reply to a video/image\n" +
          "2. Type: /aichip describe this\n\n" +
          "📎 OR send media with caption:\n" +
          "Send video/image with /aichip in caption",
          threadID,
          messageID
        );
      }
    }

    // Send processing message
    const processingMsg = await api.sendMessage(
      mediaUrl ? `🎬 Analyzing ${mediaType}... Please wait.` : "🤔 Thinking... Please wait.",
      threadID
    );

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message to memory
    memory[threadID].push(`${firstName}: ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-6).join("\n");
    const fullPrompt = mediaUrl 
      ? `${history}\nAnalyze this ${mediaType} and describe it in detail.`
      : `${history}\nAI:`;

    // Build API URL with new API
    const apiKey = "ee1b10c17fbcbaaea74deb12d96213b896f2a6daa288af09b9ddb1f1b1ae209d";
    
    let apiUrl = `https://oreo.gleeze.com/api/chipp?ask=${encodeURIComponent(fullPrompt)}&uid=${senderID}&roleplay=&stream=false&api_key=${apiKey}`;
    
    // Add image URL if media present
    if (mediaUrl) {
      apiUrl += `&img_url=${encodeURIComponent(mediaUrl)}`;
    }

    // Call the API
    const response = await axios.get(apiUrl, { timeout: 30000 });
    
    let reply = response.data;

    // Handle response format
    if (typeof reply === "string") {
      // Good
    } else if (reply && typeof reply === "object") {
      reply = reply.response || reply.reply || reply.message || 
              reply.answer || reply.result || reply.text || "";
    } else {
      reply = "";
    }

    reply = String(reply).trim();

    // Clean up response
    reply = reply.replace(/https?:\/\/[^\s]+/g, '');
    reply = reply.replace(/\s+/g, ' ').trim();

    if (!reply || reply === "" || reply === "[object Object]") {
      return api.editMessage(
        "❌ AI couldn't generate a response. Try again.",
        processingMsg.messageID,
        threadID
      );
    }

    // Format into paragraphs for long responses
    if (reply.length > 150 && !reply.includes('\n\n')) {
      const sentences = reply.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 3) {
        const mid = Math.ceil(sentences.length / 2);
        const firstHalf = sentences.slice(0, mid).join(' ').trim();
        const secondHalf = sentences.slice(mid).join(' ').trim();
        if (secondHalf) {
          reply = `${firstHalf}\n\n${secondHalf}`;
        }
      }
    }

    // Store response in memory
    memory[threadID].push(`AI: ${reply}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Build response message
    let responseMessage = "";
    
    if (mediaUrl) {
      responseMessage += `🤖 AI CHIP ANALYSIS\n━━━━━━━━━━━━━━━━\n\n`;
      responseMessage += `📹 ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Description:\n\n`;
    }
    
    responseMessage += reply;
    
    if (mediaUrl) {
      responseMessage += `\n\n━━━━━━━━━━━━━━━━`;
    }

    // Edit the processing message with the result
    await api.editMessage(
      responseMessage,
      processingMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error("AIChip Error:", err.message);
    api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};

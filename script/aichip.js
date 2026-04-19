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
          "/aichip <your question>\n\n" +
          "📹 VIDEO ANALYSIS:\n" +
          "Reply to a video with /aichip describe this\n\n" +
          "🖼️ IMAGE ANALYSIS:\n" +
          "Reply to an image with /aichip describe this",
          threadID,
          messageID
        );
      }
    }

    // Send processing message
    const processingMsg = await api.sendMessage(
      mediaUrl ? `🎬 Analyzing ${mediaType}... This may take a moment.` : "🤔 Thinking... Please wait.",
      threadID
    );

    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    let apiUrl;
    let reply;
    const apiKey = "d48ff6e54c518a8ff88fb11b6aa938508e5d4fb65479d8605527a95375ad7faa";

    if (mediaUrl) {
      if (mediaType === "video") {
        // VIDEO ANALYSIS - Using your apiremake API
        const finalPrompt = `Analyze this video and provide a detailed description. Describe exactly what you see: the setting, objects, people, actions, colors, mood, and any notable details. Do NOT return a URL or link. Question: ${prompt}`;
        
        apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(finalPrompt)}&uid=${senderID}&roleplay=&img_url=${encodeURIComponent(mediaUrl)}&api_key=${apiKey}`;
        
        const response = await axios.get(apiUrl);
        reply = response.data;

        // Handle JSON response
        if (typeof reply === "string") {
          try { reply = JSON.parse(reply); } catch (e) {}
        }
        if (reply && typeof reply === "object") {
          reply = reply.answer || reply.response || reply.reply || reply.message || reply.result || reply.text || "";
        }
        
      } else {
        // IMAGE ANALYSIS - Using dur4nto-yeager API
        apiUrl = `https://www.dur4nto-yeager.rf.gd/mahi/prompt?imgUrl=${encodeURIComponent(mediaUrl)}`;
        
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        if (data && data.success === true) {
          reply = data.prompt || "";
        } else {
          reply = "";
        }
      }
      
    } else {
      // TEXT CHAT - Using apiremake API with memory
      if (!memory[threadID]) memory[threadID] = [];
      memory[threadID].push(`${senderName}: ${prompt}`);
      const history = memory[threadID].slice(-6).join("\n");
      const finalPrompt = `${history}\nAI:`;
      
      apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(finalPrompt)}&uid=${senderID}&api_key=${apiKey}`;
      
      const response = await axios.get(apiUrl);
      reply = response.data;

      if (typeof reply === "string") {
        try { reply = JSON.parse(reply); } catch (e) {}
      }
      if (reply && typeof reply === "object") {
        reply = reply.answer || reply.response || reply.message || "";
      }
      
      memory[threadID].push(`AI: ${reply}`);
    }

    reply = String(reply).trim();

    // Remove any URLs and extra parameters from the response
    reply = reply.replace(/https?:\/\/[^\s]+/g, '');
    reply = reply.replace(/--ar\s+\d+:\d+/g, '');
    reply = reply.replace(/--q\s+\d+/g, '');
    reply = reply.replace(/--s\s+\d+/g, '');
    reply = reply.replace(/\s+/g, ' ').trim();

    // Format into paragraphs
    if (!reply.includes('\n\n')) {
      const sentences = reply.split('. ');
      let paragraphs = [];
      let currentPara = [];
      
      for (let i = 0; i < sentences.length; i++) {
        currentPara.push(sentences[i]);
        if (currentPara.length >= 3 || i === sentences.length - 1) {
          paragraphs.push(currentPara.join('. ') + (i === sentences.length - 1 ? '' : '.'));
          currentPara = [];
        }
      }
      reply = paragraphs.join('\n\n');
    }

    if (!reply || reply === "") {
      return api.editMessage(
        "❌ Couldn't generate a description. Try again.",
        processingMsg.messageID,
        threadID
      );
    }

    // Build response message
    let responseMessage = `🤖 AI CHIP ANALYSIS\n━━━━━━━━━━━━━━━━\n\n`;
    
    if (mediaUrl) {
      responseMessage += mediaType === "video" ? `📹 Video Description:\n\n` : `🖼️ Image Description:\n\n`;
    }
    
    responseMessage += `${reply}\n\n━━━━━━━━━━━━━━━━`;

    await api.editMessage(responseMessage, processingMsg.messageID, threadID);

  } catch (err) {
    console.error(err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

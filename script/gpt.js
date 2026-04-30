const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Bible study AI that knows your name and gender",
  commandCategory: "religion",
  usages: "gpt <question>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "📖 GPT Usage: gpt <question>\nExample: gpt what is faith?",
      threadID,
      messageID
    );
  }

  try {
    // Get Facebook user info
    const userInfo = await api.getUserInfo(senderID);
    const userData = userInfo[senderID];

    const fullName = userData?.name || "User";
    const firstName = fullName.split(" ")[0];
    const genderNum = userData?.gender || "0";

    // Convert gender
    let genderText;
    if (genderNum === "2" || genderNum === 2) {
      genderText = "male";
    } else if (genderNum === "1" || genderNum === 1) {
      genderText = "female";
    } else {
      genderText = "person";
    }

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message
    memory[threadID].push(`${firstName}: ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-4).join("\n");

    // Bible-focused system prompt
    const systemPrompt = `You are BibleGPT, a compassionate and knowledgeable Bible study assistant. Your purpose is to help people understand the Bible, Christian theology, and spiritual matters. Follow these guidelines:

1. Base your answers on Scripture whenever possible
2. Be compassionate, empathetic, and non-judgmental
3. Use clear and simple English
4. When appropriate, reference specific Bible verses
5. Be respectful of all denominations
6. Offer hope and point to God's love and grace
7. If someone expresses guilt or sadness, be gentle and offer comfort
8. If someone expresses joy or gratitude, celebrate with them
9. Address the user by their name naturally
10. Keep responses warm and personal
11. Answer it with Tagalog Language`;

    // Build full prompt with system instructions and conversation
    const fullPrompt = `${systemPrompt}\n\nYou are talking to ${fullName} (${firstName}), a ${genderText}.\n\nConversation:\n${history}\n\nBibleGPT:`;

    // Call Mistral API
    const apiUrl = "https://enzoanologylie.vercel.app/api/mistral";
    const response = await axios.get(apiUrl, {
      params: { prompt: fullPrompt },
      timeout: 20000
    });

    let reply = response.data;

    // Handle response format
    if (typeof reply === "string") {
      // Good
    } else if (reply && typeof reply === "object") {
      reply = reply.result || reply.response || reply.message || 
              reply.answer || reply.text || reply.reply || reply.data || "";
    }

    reply = String(reply).trim();

    // Remove quotes if wrapped
    if ((reply.startsWith('"') && reply.endsWith('"')) || 
        (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }

    if (!reply || reply === "[object Object]") {
      return api.sendMessage("❌ No response. Try again.", threadID, messageID);
    }

    // Store response
    memory[threadID].push(`BibleGPT: ${reply}`);

    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send answer only
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("GPT Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

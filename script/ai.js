const axios = require("axios");

module.exports.config = {
  name: "ai",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI that knows your Facebook name and gender",
  commandCategory: "ai",
  usages: "ai <question>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "🤖 AI Usage: ai <question>\nExample: ai what is my name?",
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

    // Convert gender number to text using ws3-fca format
    let genderText, title, pronoun, possessive;
    if (genderNum === "2" || genderNum === 2) {
      genderText = "male";
      title = "sir";
      pronoun = "he";
      possessive = "his";
    } else if (genderNum === "1" || genderNum === 1) {
      genderText = "female";
      title = "ma'am";
      pronoun = "she";
      possessive = "her";
    } else {
      genderText = "unknown";
      title = "";
      pronoun = "they";
      possessive = "their";
    }

    // Initialize memory for this thread
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message with identity
    memory[threadID].push(`${firstName} (${genderText}): ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-6).join("\n");

    // Enhanced prompt with user's full identity
    const enhancedPrompt = `You are talking to a ${genderText} person named ${fullName} (first name: ${firstName}). Address them as "${firstName}" and use ${pronoun}/${possessive} pronouns when needed. Be friendly and personal. Conversation:\n${history}\nAI:`;

    // Call Gemini API
    const apiUrl = `https://pasayloakomego.onrender.com/api/gemini?prompt=${encodeURIComponent(enhancedPrompt)}&uid=${senderID}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    let reply = response.data;

    // Extract text from response
    if (typeof reply === "string") {
      // Already a string
    } else if (reply && typeof reply === "object") {
      reply = reply.result || reply.response || reply.message || 
              reply.answer || reply.text || reply.reply || reply.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      reply = "";
    }

    reply = String(reply).trim();

    // Remove JSON wrapping if present
    if ((reply.startsWith('"') && reply.endsWith('"')) || 
        (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }

    if (!reply || reply === "[object Object]") {
      return api.sendMessage("❌ No response. Try again.", threadID, messageID);
    }

    // Store response in memory
    memory[threadID].push(`AI: ${reply}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send only the answer
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("AI Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

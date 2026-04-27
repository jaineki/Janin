const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI-powered Bible study assistant with empathetic responses",
  commandCategory: "religion",
  usages: "gpt <question>",
  cooldowns: 3
};

// Store user conversation history
if (!global.bibleAIUsers) global.bibleAIUsers = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const userQuestion = args.join(" ").trim();

  if (!userQuestion) {
    return api.sendMessage(
      `📖 BIBLE GPT\n━━━━━━━━━━━━━━━━\n` +
      `Ask me anything about the Bible!\n\n` +
      `Examples:\n` +
      `• gpt What does the Bible say about forgiveness?\n` +
      `• gpt Explain John 3:16\n` +
      `• gpt How can I grow in faith?\n` +
      `• gpt Nagkasala ako, ano ang gagawin ko?`,
      threadID,
      messageID
    );
  }

  // Initialize user memory
  if (!global.bibleAIUsers[senderID]) {
    global.bibleAIUsers[senderID] = [];
  }

  // Get user name
  let userName = "kaibigan";
  try {
    const userInfo = await api.getUserInfo(senderID);
    userName = userInfo[senderID]?.name?.split(" ")[0] || "kaibigan";
  } catch (e) {
    console.error("Get user info error:", e);
  }

  try {
    // Detect emotional tone
    const sadKeywords = ["nagkasala", "kasalanan", "sad", "malungkot", "guilty", "error", "mistake", "failure", "mali", "pagsisisi", "sorry", "patawad", "kasalanan"];
    const happyKeywords = ["salamat", "thank", "grateful", "saya", "happy", "blessed", "pinagpala", "maganda", "masaya"];
    
    const lowerQuestion = userQuestion.toLowerCase();
    const isSad = sadKeywords.some(k => lowerQuestion.includes(k));
    const isHappy = happyKeywords.some(k => lowerQuestion.includes(k));
    
    let emotionalContext = "";
    if (isSad) {
      emotionalContext = "The user is expressing guilt, sadness, or concern. Be GENTLE and COMPASSIONATE. Offer hope. Start with empathy.";
    } else if (isHappy) {
      emotionalContext = "The user seems joyful or grateful. Be warm and cheerful.";
    } else {
      emotionalContext = "Neutral tone. Be warm and helpful.";
    }

    // Build conversation history
    const history = global.bibleAIUsers[senderID].slice(-4);
    let historyText = "";
    if (history.length > 0) {
      historyText = history.map(h => `User: ${h.question}\nAI: ${h.answer}`).join("\n") + "\n";
    }

    // Build prompt
    const fullPrompt = `You are BibleGPT, a compassionate Bible study assistant. Use Taglish naturally. Be empathetic.\n` +
                       `${emotionalContext}\n` +
                       `Conversation history:\n` +
                       `${historyText}\n` +
                       `${userName} asks: ${userQuestion}\n` +
                       `Provide a Bible-based, empathetic response.`;
    
    // Call API
    const apiUrl = `https://pasayloakomego.onrender.com/api/chatgptsearch?prompt=${encodeURIComponent(fullPrompt)}`;
    const response = await axios.get(apiUrl, { timeout: 30000 });

    let answer = "Sorry, I couldn't generate a response.";

    if (response.data) {
      if (typeof response.data === "string") {
        answer = response.data;
      } else {
        answer = response.data.result || response.data.response || 
                 response.data.message || response.data.answer || answer;
      }
    }

    answer = String(answer).trim();

    // Clean up formatting
    answer = answer.replace(/```/g, "");
    answer = answer.replace(/\s+/g, " ").trim();

    // Format into paragraphs for long answers
    if (answer.length > 200 && !answer.includes("\n\n")) {
      const sentences = answer.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 3) {
        const mid = Math.ceil(sentences.length / 2);
        const firstHalf = sentences.slice(0, mid).join(" ").trim();
        const secondHalf = sentences.slice(mid).join(" ").trim();
        answer = `${firstHalf}\n\n${secondHalf}`;
      }
    }

    if (!answer || answer === "") {
      return api.sendMessage("❌ Empty response. Try again.", threadID, messageID);
    }

    // Store in memory
    global.bibleAIUsers[senderID].push({
      question: userQuestion,
      answer: answer,
      timestamp: Date.now()
    });

    // Keep memory manageable
    if (global.bibleAIUsers[senderID].length > 20) {
      global.bibleAIUsers[senderID] = global.bibleAIUsers[senderID].slice(-10);
    }

    // Send answer
    api.sendMessage(answer, threadID, messageID);

  } catch (err) {
    console.error("BibleGPT Error:", err);
    
    let errorMsg = "❌ Sorry, something went wrong. Please try again.";
    
    if (err.response?.status === 400) {
      errorMsg = "❌ Invalid request. Try a different question.";
    } else if (err.code === "ECONNABORTED") {
      errorMsg = "❌ Request timed out. Please try again.";
    }
    
    api.sendMessage(errorMsg, threadID, messageID);
  }
};

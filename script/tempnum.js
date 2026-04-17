const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://receive-smss.com";

// Global storage for user's temporary phone number data
// Stores { senderID: { number: "+1234567890", watchInterval: intervalID } }
if (!global.autobotTempNum) global.autobotTempNum = new Map();

// Helper function to extract verification codes from SMS text
function extractCodes(messages) {
  const codes = [];
  for (const msg of messages) {
    const matches = msg.text.match(/\b(\d{4,8})\b/g); // Look for 4 to 8 digit numbers
    if (matches) {
      codes.push(...matches.filter((c) => c.length >= 4)); // Filter for codes at least 4 digits long
    }
  }
  return [...new Set(codes)]; // Return unique codes
}

// Helper function to format phone numbers
function formatPhone(input) {
  if (!input) return null;
  let num = input.trim().replace(/[^\d+]/g, "");
  if (!num.startsWith("+")) {
    num = "+" + num;
  }
  return num.length >= 8 ? num : null; // Basic validation for phone number length
}

// Helper function to fetch available numbers from receive-smss.com
async function getAvailableNumbers() {
  const response = await axios.get(BASE_URL, { timeout: 15000 });
  const $ = cheerio.load(response.data);
  const numbers = [];

  $("div").each((i, el) => {
    const html = $(el).html() || "";
    if (
      html.includes("+1") ||
      html.includes("+4") ||
      html.includes("+3") ||
      html.includes("+2")
    ) {
      const text = $(el).text().trim();
      const match = text.match(/\+[\d\s\-()]{8,20}/);
      if (match && text.length < 200) {
        const num = match[0].replace(/[\s\-()]/g, "");
        const country = text.replace(match[0], "").trim().split("\n")[0];
        if (num.length >= 8 && num.length <= 15) {
          numbers.push({ number: num, country: country || "Unknown" });
        }
      }
    }
  });
  return numbers.slice(0, 30); // Limit to 30 numbers for brevity
}

// Helper function to fetch messages for a given phone number
async function fetchMessages(phone) {
  const clean = phone.replace(/[\s+]/g, "").replace("+", "");
  const url = BASE_URL + "/sms/" + clean + "/";

  const response = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(response.data);
  const messages = [];

  $(".message_details").each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10 && !text.includes("Update Messages")) {
      let msgText = text
        .replace(/Message/gi, "")
        .replace(/From/gi, "")
        .replace(/\d{4}-\d{2}-\d{2}/g, "")
        .replace(/\d{2}:\d{2}:\d{2}/g, "")
        .trim();

      if (msgText.length > 5 && !msgText.includes("adsbygoogle")) {
        messages.push({
          text: msgText.replace(/\s+/g, " ").substring(0, 200),
          from: "Unknown",
          time: "Recently",
        });
      }
    }
  });

  $("span").each((i, el) => {
    const html = $(el).html() || "";
    if (html.includes("btn22cp") || $(el).attr("data-clipboard-text")) {
      const text = $(el).text().trim();
      const code = $(el).attr("data-clipboard-text");
      if (code && text && text.length > 3) {
        const exists = messages.some((m) => m.text.includes(code));
        if (!exists) {
          messages.push({
            text: text.substring(0, 200),
            from: "Unknown",
            time: "Recently",
          });
        }
      }
    }
  });
  return messages;
}

module.exports.config = {
  name: "tempnum",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Get free temporary phone numbers for SMS verification.",
  commandCategory: "utility",
  usages: "tempnum [numbers|check <number>|use <number>|watch <number>|stop]",
  cooldowns: 5,
  aliases: ["sms", "freeSMS", "smsfree", "phone"]
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const subCommand = args[0]?.toLowerCase();
  const userData = global.autobotTempNum.get(senderID) || {};

  switch (subCommand) {
    case "numbers":
    case "list":
    case "get":
      api.sendMessage("⏳ Fetching available numbers...", threadID, messageID);
      try {
        const numbers = await getAvailableNumbers();
        if (numbers.length === 0) {
          return api.sendMessage("❌ No numbers currently available. Please try again later.", threadID, messageID);
        }

        let reply = "📞 Available Temporary Numbers:\n━━━━━━━━━━━━━━━━━━\n";
        numbers.slice(0, 15).forEach((n, i) => {
          reply += `${i + 1}. ${n.number} (${n.country})\n`;
        });

        if (numbers.length > 15) {
          reply += `\n... and ${numbers.length - 15} more.`;
        }
        reply += "\n\n💡 Use `tempnum check <number>` or `tempnum use <number>`";
        api.sendMessage(reply, threadID, messageID);
      } catch (e) {
        console.error("[tempnum] Error fetching numbers:", e);
        api.sendMessage(`❌ Failed to fetch numbers: ${e.message}`, threadID, messageID);
      }
      break;

    case "check":
    case "read":
      let phoneToCheck = args[1] || userData.number;
      if (!phoneToCheck) {
        return api.sendMessage("📌 Usage: `tempnum check <number>` or `tempnum use <number>` first.", threadID, messageID);
      }
      phoneToCheck = formatPhone(phoneToCheck);
      if (!phoneToCheck) {
        return api.sendMessage("❌ Invalid phone number format. Please include country code (e.g., +1234567890).", threadID, messageID);
      }

      api.sendMessage(`⏳ Checking messages for **${phoneToCheck}**...`, threadID, messageID);
      try {
        const msgs = await fetchMessages(phoneToCheck);

        if (msgs.length === 0) {
          return api.sendMessage(`📭 No messages yet for **${phoneToCheck}**. Try again in a moment.`, threadID, messageID);
        }

        let reply = `📬 **Messages for ${phoneToCheck}** (${msgs.length} total):\n━━━━━━━━━━━━━━━━━━\n`;
        msgs.slice(0, 10).forEach((m, i) => {
          reply += `${i + 1}. From: ${m.from}\n`;
          reply += `   Time: ${m.time}\n`;
          reply += `   Message: ${m.text}\n\n`;
        });
        if (msgs.length > 10) {
          reply += `... showing 10 of ${msgs.length} messages.\n`;
        }
        reply += "━━━━━━━━━━━━━━━━━━";
        api.sendMessage(reply, threadID, messageID);
      } catch (e) {
        console.error("[tempnum] Error checking messages:", e);
        api.sendMessage(`❌ Failed to check messages for ${phoneToCheck}: ${e.message}`, threadID, messageID);
      }
      break;

    case "use":
      const numberToUse = args[1];
      if (!numberToUse) {
        return api.sendMessage("📌 Usage: `tempnum use <number>`", threadID, messageID);
      }
      const formattedNumber = formatPhone(numberToUse);
      if (!formattedNumber) {
        return api.sendMessage("❌ Invalid phone number format. Please include country code (e.g., +1234567890).", threadID, messageID);
      }
      global.autobotTempNum.set(senderID, { ...userData, number: formattedNumber });
      api.sendMessage(`✅ You are now using ${formattedNumber} for ` + this.config.name + ` commands.`, threadID, messageID);
      break;

    case "watch":
      let phoneToWatch = args[1] || userData.number;
      if (!phoneToWatch) {
        return api.sendMessage("📌 Usage: `tempnum watch <number>` or `tempnum use <number>` first.", threadID, messageID);
      }
      phoneToWatch = formatPhone(phoneToWatch);
      if (!phoneToWatch) {
        return api.sendMessage("❌ Invalid phone number format. Please include country code (e.g., +1234567890).", threadID, messageID);
      }

      if (userData.watchInterval) {
        clearInterval(userData.watchInterval);
        api.sendMessage(`🛑 Stopped previous watch for ${userData.number}.`, threadID);
      }

      api.sendMessage(`👀 Watching ${phoneToWatch} for new SMS codes (checking every 10 seconds)...`, threadID, messageID);

      const interval = setInterval(async () => {
        try {
          const msgs = await fetchMessages(phoneToWatch);
          const codes = extractCodes(msgs);
          if (codes.length > 0) {
            let reply = `🔑 CODE DETECTED for ${phoneToWatch}!\n━━━━━━━━━━━━━━━━━━\n`;
            codes.slice(0, 3).forEach((c, i) => {
              reply += `${i + 1}. ${c}\n`;
            });
            reply += "━━━━━━━━━━━━━━━━━━\n🛑 Auto-watch stopped.";
            api.sendMessage(reply, threadID);
            clearInterval(interval);
            const updatedUserData = global.autobotTempNum.get(senderID);
            if (updatedUserData) {
              delete updatedUserData.watchInterval;
              global.autobotTempNum.set(senderID, updatedUserData);
            }
          }
        } catch (e) {
          console.error(`[tempnum] Watch error for ${phoneToWatch}:`, e.message);
        }
      }, 10000); // Check every 10 seconds

      global.autobotTempNum.set(senderID, { ...userData, number: phoneToWatch, watchInterval: interval });
      break;

    case "stop":
      if (userData.watchInterval) {
        clearInterval(userData.watchInterval);
        const updatedUserData = global.autobotTempNum.get(senderID);
        if (updatedUserData) {
          delete updatedUserData.watchInterval;
          global.autobotTempNum.set(senderID, updatedUserData);
        }
        return api.sendMessage("🛑 Stopped auto-watch.", threadID, messageID);
      }
      return api.sendMessage("Nothing to stop. No active auto-watch found.", threadID, messageID);

    default:
      let defaultReply = "📞 Temporary Phone Numbers (tempnum)\n━━━━━━━━━━━━━━━━━━\n";
      defaultReply += "`tempnum numbers` - Get available numbers\n";
      defaultReply += "`tempnum check <number>` - Check messages for a number\n";
      defaultReply += "`tempnum use <number>` - Save a number for quick access\n";
      defaultReply += "`tempnum watch <number>` - Auto-check for codes every 10s\n";
      defaultReply += "`tempnum stop` - Stop auto-watch\n";
      if (userData.number) {
        defaultReply += `\nCurrently using: **${userData.number}**`;
      }
      defaultReply += "\n━━━━━━━━━━━━━━━━━━";
      api.sendMessage(defaultReply, threadID, messageID);
      break;
  }
};

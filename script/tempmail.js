const axios = require("axios");

// --- Configuration for Service 1 (timpmeyl.indevs.in) ---
const DEFAULT_DOMAIN = "@timpmeyl.indevs.in";
const DEFAULT_API_BASE_URL = "https://temporary-emaill.netlify.app/api/messages";

// --- Configuration for Service 2 (Guerrilla Mail) ---
const GUERRILLA_API_BASE_URL = "https://api.guerrillamail.com/ajax.php";

// Global storage for user's temporary email data
// Stores { senderID: { default: { email: "", created: timestamp }, guerrilla: { email: "", sid_token: "", created: timestamp } } }
if (!global.tempmailData) global.tempmailData = new Map();

// Helper function to extract verification codes from email body/subject
function extractCode(text) {
  if (!text) return null;
  const patterns = [
    /\b(\d{6})\b/,
    /\b(\d{5})\b/,
    /\b(\d{4})\b/,
    /code[:\s]*(\d+)/i,
    /FB[-:\s]*(\d+)/i,
    /confirmation[-:\s]*(\d+)/i,
    /password[:\s]*([A-Z0-9]+)/i,
    /otp[:\s]*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

module.exports.config = {
  name: "tempmail",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Generate temporary email addresses and check their inboxes from two services.",
  commandCategory: "utility",
  usages: "tempmail [gen <default|guerrilla> | inbox <email_address> | myemail]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const subCommand = args[0]?.toLowerCase();
  const userTempmailData = global.tempmailData.get(senderID) || {};

  if (subCommand === "gen") {
    const serviceType = args[1]?.toLowerCase() || "default"; // Default to the first service

    if (serviceType === "default") {
      const randomString = Math.random().toString(36).substring(2, 15);
      const newEmail = `${randomString}${DEFAULT_DOMAIN}`;
      userTempmailData.default = { email: newEmail, created: Date.now() };
      global.tempmailData.set(senderID, userTempmailData);

      api.sendMessage(
        `📧 Temporary Email (Default) Generated:\n━━━━━━━━━━━━━━━━\nYour new email is: \n${newEmail}\n\nTo check its inbox, use: \ntempmail inbox ${newEmail}\n\nThis email is valid for a short period.`, 
        threadID,
        messageID
      );
    } else if (serviceType === "guerrilla") {
      try {
        const res = await axios.get(GUERRILLA_API_BASE_URL + "?f=get_email_address", { timeout: 10000 });
        const data = res.data;

        if (data.email_addr && data.sid_token) {
          userTempmailData.guerrilla = { email: data.email_addr, sid_token: data.sid_token, created: Date.now() };
          global.tempmailData.set(senderID, userTempmailData);

          api.sendMessage(
            `✅ Guerrilla Mail Generated!\n━━━━━━━━━━━━━━━━━━\n📧 ${data.email_addr}\n\n📌 Emails deleted after 1 hour\n💡 Use tempmail inbox ${data.email_addr} to view inbox\n━━━━━━━━━━━━━━━━━━`, 
            threadID,
            messageID
          );
        } else {
          throw new Error("No email or SID token returned from Guerrilla Mail.");
        }
      } catch (error) {
        console.error("[GuerrillaMail] Gen error:", error.message);
        api.sendMessage("❌ Failed to generate Guerrilla Mail: " + error.message, threadID, messageID);
      }
    } else {
      api.sendMessage(
        "📌 Usage: tempmail gen <default|guerrilla>",
        threadID,
        messageID
      );
    }
  } else if (subCommand === "inbox") {
    const emailAddress = args[1];

    if (!emailAddress) {
      return api.sendMessage(
        "📌 Usage: tempmail inbox <email_address>",
        threadID,
        messageID
      );
    }

    api.sendMessage(`⏳ Checking inbox for ${emailAddress}...`, threadID, async (err, info) => {
      if (err) {
        console.error("Error sending checking message:", err);
        return;
      }

      try {
        if (emailAddress.endsWith(DEFAULT_DOMAIN)) {
          // Check default service inbox
          const response = await axios.get(`${DEFAULT_API_BASE_URL}?address=${encodeURIComponent(emailAddress)}`);
          const messages = response.data;

          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return api.sendMessage(`📥 Inbox for ${emailAddress} is empty.`, threadID, messageID);
          }

          let inboxContent = `📥 **Inbox for ${emailAddress}:**\n━━━━━━━━━━━━━━━━\n`;
          messages.forEach((msg, index) => {
            inboxContent += `${index + 1}. From: ${msg.from || "Unknown"}\n`;
            inboxContent += `Subject: ${msg.subject || "(No Subject)"}\n`;
            inboxContent += `Date: ${msg.date ? new Date(msg.date).toLocaleString() : "Unknown"}\n`;
            inboxContent += `Body: ${msg.body ? msg.body.substring(0, 200) : "(No Content)"}...\n`;
            inboxContent += `------------------------\n`;
          });
          api.sendMessage(inboxContent, threadID, messageID);

        } else if (emailAddress.includes("@guerrillamail.com")) {
          // Check Guerrilla Mail inbox
          const guerrillaMailData = userTempmailData.guerrilla;
          if (!guerrillaMailData || guerrillaMailData.email !== emailAddress) {
            return api.sendMessage("❌ This Guerrilla Mail address was not generated by you or is expired. Please generate a new one.", threadID, messageID);
          }

          const res = await axios.get(
            GUERRILLA_API_BASE_URL +
              "?f=get_email_list&offset=0&sid_token=" +
              encodeURIComponent(guerrillaMailData.sid_token),
            { timeout: 15000 }
          );
          const data = res.data;
          const messages = data.list || [];

          if (messages.length === 0) {
            return api.sendMessage(`📭 No messages in inbox for **${emailAddress}**.`, threadID, messageID);
          }

          let reply = `📬 **Guerrilla Mail Inbox**\n━━━━━━━━━━━━━━━━━━\n📧 **${emailAddress}**\n📊 ${messages.length} message(s)\n\n`;
          for (let i = 0; i < Math.min(messages.length, 5); i++) {
            const msg = messages[i];
            const subject = msg.mail_subject || "No Subject";
            const from = msg.mail_from || "Unknown";
            const body = msg.mail_body || "";
            const code = extractCode(subject) || extractCode(body);

            reply += `${i + 1}. 📩 From: ${from}\n`;
            reply += `   Subject: ${subject.substring(0, 50)}${subject.length > 50 ? "..." : ""}\n`;
            if (code) {
              reply += `   🔑 Code: ${code}\n`;
            }
            reply += `\n`;
          }
          if (messages.length > 5) {
            reply += `📌 Showing 5 of ${messages.length} messages\n\n`;
          }
          reply += "━━━━━━━━━━━━━━━━━━";
          api.sendMessage(reply, threadID, messageID);

        } else {
          api.sendMessage("❌ Unknown email domain. Please use an email from our supported services.", threadID, messageID);
        }

      } catch (error) {
        console.error("Error fetching tempmail inbox:", error);
        api.sendMessage(
          `❌ Failed to fetch inbox for ${emailAddress}. Please try again later.`, 
          threadID,
          messageID
        );
      }
    }, messageID);
  } else if (subCommand === "myemail") {
    let reply = "📧 Your Temporary Emails:\n━━━━━━━━━━━━━━━━━━\n";
    let hasEmail = false;

    if (userTempmailData.default && userTempmailData.default.email) {
      reply += `Default: ${userTempmailData.default.email}\n`;
      hasEmail = true;
    }
    if (userTempmailData.guerrilla && userTempmailData.guerrilla.email) {
      reply += `Guerrilla: ${userTempmailData.guerrilla.email}\n`;
      hasEmail = true;
    }

    if (!hasEmail) {
      return api.sendMessage("❌ You haven't generated any temporary emails yet. Use `tempmail gen <default|guerrilla>`.", threadID, messageID);
    }
    reply += "━━━━━━━━━━━━━━━━━━";
    api.sendMessage(reply, threadID, messageID);
  } else {
    api.sendMessage(
      "📌 Usage:\n• tempmail gen <default|guerrilla> (to generate a new email)\n• tempmail inbox <email_address> (to check inbox)\n• tempmail myemail (to show your current emails)",
      threadID,
      messageID
    );
  }
};

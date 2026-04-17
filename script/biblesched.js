const cron = require("node-cron");

// Admin UIDs - Only admins can start/stop the schedule
const ADMIN_UIDS = ["61556388598622", "61552057602849"];

// Bible verses categorized by topic
const bibleVerses = {
  lust: [
    "Matthew 5:28 - But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart.",
    "1 John 2:16 - For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world.",
    "Proverbs 6:25 - Do not lust in your heart after her beauty or let her captivate you with her eyes."
  ],
  '666': [
    "Revelation 13:16-18 - It also forced all people, great and small, rich and poor, free and slave, to receive a mark on their right hands or on their foreheads, so that they could not buy or sell unless they had the mark, which is the name of the beast or the number of its name. This calls for wisdom. Let anyone who has insight calculate the number of the beast, for it is the number of a man. That number is 666."
  ],
  humble: [
    "Proverbs 22:4 - Humility is the fear of the Lord; its wages are riches and honor and life.",
    "James 4:10 - Humble yourselves before the Lord, and he will lift you up.",
    "1 Peter 5:6 - Humble yourselves, therefore, under God’s mighty hand, that he may lift you up in due time.",
    "Philippians 2:3 - Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves."
  ]
};

// Store scheduled tasks globally so they can be managed
// This map will hold cron job instances, keyed by schedule name (e.g., 'morning', 'afternoon', 'evening')
if (!global.autobotBibleSchedules) global.autobotBibleSchedules = new Map();

// Function to send a random Bible verse to all group chats
async function sendBibleVerse(api, topic) {
  const verses = bibleVerses[topic];
  if (!verses || verses.length === 0) {
    console.error(`[biblesched] No verses found for topic: ${topic}`);
    return;
  }
  const randomVerse = verses[Math.floor(Math.random() * verses.length)];
  const message = `📖 DAILY BIBLE VERSE\n━━━━━━━━━━━━━━\nTopic: ${topic.toUpperCase()}\n\n${randomVerse}\n━━━━━━━━━━━━━━\n_"The grass withers and the flowers fall, but the word of our God endures forever." - Isaiah 40:8_`;

  try {
    // Fetch all threads the bot is in. Using -1 for limit to get all threads.
    // The type filter is removed to ensure all threads are considered, then we filter for groups.
    const allThreads = await api.getThreadList(-1, null, []); 
    let sentCount = 0;
    for (const thread of allThreads) {
      // Check if it's a group chat (threadID is not equal to participantID for group chats)
      // This is a common way to distinguish group chats from 1:1 chats in FCA
      if (thread.isGroup && thread.threadID !== thread.participantIDs[0]) { 
        try {
          await api.sendMessage(message, thread.threadID);
          sentCount++;
        } catch (error) {
          console.error(`[biblesched] Failed to send Bible verse to thread ${thread.threadID}: ${error.message}`);
        }
      }
    }
    console.log(`[biblesched] Sent Bible verse (${topic}) to ${sentCount} group chats.`);
  } catch (err) {
    console.error("[biblesched] Error getting thread list for Bible verse broadcast:", err);
  }
}

// Function to start all schedules
function startSchedules(api) {
  // Clear any existing schedules to prevent duplicates
  stopSchedules();

  // Schedule for Morning (8:00 AM PHT - UTC+8) - Lust
  const morningJob = cron.schedule('0 0 8 * * *', () => sendBibleVerse(api, 'lust'), {
    timezone: "Asia/Manila"
  });
  global.autobotBibleSchedules.set('morning', morningJob);

  // Schedule for Afternoon (1:00 PM PHT - UTC+8) - 666
  const afternoonJob = cron.schedule('0 0 13 * * *', () => sendBibleVerse(api, '666'), {
    timezone: "Asia/Manila"
  });
  global.autobotBibleSchedules.set('afternoon', afternoonJob);

  // Schedule for Evening (7:00 PM PHT - UTC+8) - Humble
  const eveningJob = cron.schedule('0 0 19 * * *', () => sendBibleVerse(api, 'humble'), {
    timezone: "Asia/Manila"
  });
  global.autobotBibleSchedules.set('evening', eveningJob);

  console.log("[biblesched] All Bible verse schedules started.");
}

// Function to stop all schedules
function stopSchedules() {
  global.autobotBibleSchedules.forEach(job => job.stop());
  global.autobotBibleSchedules.clear();
  console.log("[biblesched] All Bible verse schedules stopped.");
}

module.exports.config = {
  name: "biblesched",
  version: "1.1.0", // Updated version for fix
  hasPermssion: 3, // Only admins can use this command
  credits: "selov",
  description: "Schedules daily Bible verses to all group chats (lust, 666, humble).",
  commandCategory: "admin",
  usages: "biblesched [start|stop|status|test <morning|afternoon|evening>]",
  cooldowns: 5
};

// This function runs when the bot is loaded
module.exports.onLoad = function ({ api }) {
  // Automatically start schedules when the bot loads
  // This ensures persistence across restarts
  console.log("[biblesched] Attempting to start schedules on bot load...");
  startSchedules(api);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!ADMIN_UIDS.includes(senderID)) {
    return api.sendMessage("❌ You do not have permission to use this command.", threadID, messageID);
  }

  const action = args[0]?.toLowerCase();

  if (action === "start") {
    if (global.autobotBibleSchedules.size > 0) {
      return api.sendMessage("⚠️ Bible verse schedule is already running. Use `biblesched stop` first if you want to restart it.", threadID, messageID);
    }
    startSchedules(api);
    api.sendMessage("✅ Bible verse schedule started: Morning (lust), Afternoon (666), Evening (humble).", threadID, messageID);
  } else if (action === "stop") {
    if (global.autobotBibleSchedules.size === 0) {
      return api.sendMessage("⚠️ No Bible verse schedule is currently running.", threadID, messageID);
    }
    stopSchedules();
    api.sendMessage("🛑 Bible verse schedule stopped.", threadID, messageID);
  } else if (action === "status") {
    if (global.autobotBibleSchedules.size > 0) {
      api.sendMessage("✅ Bible verse schedule is currently **running**.", threadID, messageID);
    } else {
      api.sendMessage("🛑 Bible verse schedule is currently **stopped**.", threadID, messageID);
    }
  } else if (action === "test") {
    const testTopic = args[1]?.toLowerCase();
    let topicToSend = "";
    if (testTopic === "morning") {
      topicToSend = "lust";
    } else if (testTopic === "afternoon") {
      topicToSend = "666";
    } else if (testTopic === "evening") {
      topicToSend = "humble";
    } else {
      return api.sendMessage("📌 Usage: biblesched test <morning|afternoon|evening>", threadID, messageID);
    }
    api.sendMessage(`Testing Bible verse broadcast for '${testTopic}' topic...`, threadID, messageID);
    await sendBibleVerse(api, topicToSend);
  } else {
    api.sendMessage("📌 Usage: biblesched [start|stop|status|test <morning|afternoon|evening>]", threadID, messageID);
  }
};

const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sing",
  version: "1.4",
  hasPermssion: 0,
  credits: "selov",
  description: "Search and download music from YouTube with lyrics",
  commandCategory: "media",
  usages: "sing <song name>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage(
      "🎵 MUSIC COMMAND\n━━━━━━━━━━━━━━━━\nUsage: music <song name>\n\nExample: music Shape of You",
      threadID,
      messageID
    );
  }

  // React with hourglass if possible (ws3-fca supports setMessageReaction)
  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);
  } catch (e) {}

  try {
    // 1. Search for the song
    const searchRes = await axios.get(
      `https://neokex-dlapis.vercel.app/api/search?q=${encodeURIComponent(query)}`,
      { timeout: 8000 }
    );
    const results = searchRes.data?.results;
    if (!results || results.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ No results found for: " + query, threadID, messageID);
    }

    const selected = results[0];
    let artist, title;
    if (selected.title.includes(" - ")) {
      [artist, title] = selected.title.split(" - ", 2);
    } else {
      artist = query;
      title = selected.title;
    }

    // 2. Get download link (audio)
    const dlRes = await axios.get(
      `https://neokex-dlapis.vercel.app/api/alldl?url=${encodeURIComponent(selected.url)}`,
      { timeout: 8000 }
    );
    const pollUrl = dlRes.data?.audio?.downloadUrl;
    if (!pollUrl) throw new Error("No audio download URL");

    // 3. Poll for completed audio
    let streamUrl = null;
    for (let i = 0; i < 40; i++) {
      const statusRes = await axios.get(pollUrl, { timeout: 5000 });
      if (statusRes.data?.status === "completed") {
        streamUrl = statusRes.data.viewUrl;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    if (!streamUrl) throw new Error("Audio processing timeout");

    // 4. Download audio file
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const audioPath = path.join(cacheDir, `sing_${Date.now()}.mp3`);

    const audioRes = await axios.get(streamUrl, {
      responseType: "arraybuffer",
      timeout: 30000
    });
    fs.writeFileSync(audioPath, audioRes.data);

    // 5. Send audio attachment
    const msgBody = `🎵 ${selected.title}\n⏱️ ${selected.duration || "Unknown duration"}`;
    await api.sendMessage(
      {
        body: msgBody,
        attachment: fs.createReadStream(audioPath)
      },
      threadID,
      messageID
    );

    // 6. Try to fetch lyrics
    let lyricsText = null;
    try {
      const lyricsRes = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { timeout: 5000 }
      );
      lyricsText = lyricsRes.data?.lyrics;
    } catch (lyricsErr) {
      // Lyrics not found, ignore
    }

    if (lyricsText) {
      const shortLyrics = lyricsText.length > 4000 
        ? lyricsText.substring(0, 4000) + "\n\n... (truncated)" 
        : lyricsText;
      await api.sendMessage(`📜 Lyrics:\n\n${shortLyrics}`, threadID);
    } else {
      await api.sendMessage("📜 No lyrics found for this song.", threadID);
    }

    // Cleanup
    try {
      fs.unlinkSync(audioPath);
    } catch (e) {}

    api.setMessageReaction("✅", messageID, () => {}, true);

  } catch (err) {
    console.error("Sing error:", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      `❌ Error: ${err.message || "Server unreachable or slow"}`,
      threadID,
      messageID
    );
  }
};

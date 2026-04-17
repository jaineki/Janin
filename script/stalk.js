"use strict";

const axios = require("axios");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ COMMAND CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.config = {
  name: "stalk",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "Multi-platform stalker tool: MLBB, Instagram, TikTok.",
  commandCategory: "utility",
  usages: "/stalk <list | mlstalk | instastalk | tikstalk> [args]",
  cooldowns: 5,
  aliases: ["stalker", "lookup"]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function num(n) {
  if (n === undefined || n === null) return "N/A";
  return Number(n).toLocaleString();
}

function val(v) {
  if (v === undefined || v === null || v === "") return "N/A";
  return v;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 MLBB CHECKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleMLStalk(api, threadID, messageID, args) {
  const userId = args[0];
  const zoneId = args[1];

  if (!userId || !zoneId) {
    return api.sendMessage(
      `❌ Missing arguments!\n\n` +
      `📌 Usage:\n` +
      `/stalk mlstalk <userId> <zoneId>\n\n` +
      `📖 Example:\n` +
      `/stalk mlstalk 2002113712 19417`,
      threadID,
      messageID
    );
  }

  const loadMsg = await api.sendMessage(
    `🎮 Fetching MLBB player info...\n` +
    `🆔 User ID : ${userId}\n` +
    `🌐 Zone ID : ${zoneId}\n` +
    `⏳ Please wait...`,
    threadID
  );

  try {
    const res = await axios.post(
      "https://rest-apins.vercel.app/api/tools/mlbb",
      { userId, zoneId },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );

    const data = res.data;

    // Try to safely extract fields from common API response shapes
    const player =
      data?.data ||
      data?.result ||
      data?.player ||
      data;

    const nickname     = val(player?.nickname || player?.name || player?.username);
    const level        = val(player?.level || player?.exp_level);
    const rank         = val(player?.rank || player?.ranked_info?.rank_name || player?.tier);
    const server       = val(player?.server || player?.region || zoneId);
    const uid          = val(player?.uid || player?.user_id || userId);
    const avatar       = val(player?.avatar || player?.head);
    const likeCount    = num(player?.like_count || player?.likes || player?.total_likes);
    const matchCount   = num(player?.match_count || player?.total_match);
    const winRate      = val(player?.win_rate || player?.winrate);
    const squad        = val(player?.squad || player?.guild?.name || player?.team?.name);
    const mvpCount     = num(player?.mvp_count || player?.mvp);
    const heroCount    = num(player?.hero_count || player?.heroes);

    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}

    return api.sendMessage(
      `🎮 MOBILE LEGENDS: BANG BANG\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Nickname  : ${nickname}\n` +
      `🆔 User ID   : ${uid}\n` +
      `🌐 Zone ID   : ${server}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 STATS\n` +
      `⭐ Level     : ${level}\n` +
      `🏆 Rank      : ${rank}\n` +
      `🛡️ Squad     : ${squad}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 RECORDS\n` +
      `❤️ Likes     : ${likeCount}\n` +
      `🎯 Matches   : ${matchCount}\n` +
      `📊 Win Rate  : ${winRate}\n` +
      `🏅 MVP Count : ${mvpCount}\n` +
      `⚔️ Heroes    : ${heroCount}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 MLBB Stalker | /stalk mlstalk`,
      threadID,
      messageID
    );
  } catch (err) {
    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}
    console.error("[Stalk:ML] Error:", err?.message || err);

    const status = err?.response?.status;
    if (status === 404) {
      return api.sendMessage(
        `❌ Player not found!\n` +
        `Please check your User ID and Zone ID.\n\n` +
        `📌 Usage: /stalk mlstalk <userId> <zoneId>`,
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      `❌ Failed to fetch MLBB data.\n` +
      `Error: ${err?.message || "Unknown error"}\n\n` +
      `Please try again later.`,
      threadID,
      messageID
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📸 INSTAGRAM STALKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleInstaStalk(api, threadID, messageID, args) {
  const username = args[0];

  if (!username) {
    return api.sendMessage(
      `❌ Missing username!\n\n` +
      `📌 Usage:\n` +
      `/stalk instastalk <username>\n\n` +
      `📖 Example:\n` +
      `/stalk instastalk jaybohol`,
      threadID,
      messageID
    );
  }

  const loadMsg = await api.sendMessage(
    `📸 Fetching Instagram profile...\n` +
    `👤 Username : @${username}\n` +
    `⏳ Please wait...`,
    threadID
  );

  try {
    const res = await axios.get(
      `https://api.zenzxz.my.id/stalker/instagram?username=${encodeURIComponent(username)}`,
      { timeout: 15000 }
    );

    const data = res.data;
    const user =
      data?.data?.user ||
      data?.user ||
      data?.result ||
      data?.data ||
      data;

    const fullName       = val(user?.full_name || user?.name);
    const bio            = val(user?.biography || user?.bio);
    const followers      = num(user?.edge_followed_by?.count || user?.followers || user?.follower_count);
    const following      = num(user?.edge_follow?.count || user?.following || user?.following_count);
    const posts          = num(user?.edge_owner_to_timeline_media?.count || user?.posts || user?.media_count);
    const isPrivate      = user?.is_private === true ? "🔒 Private" : "🌐 Public";
    const isVerified     = user?.is_verified === true ? "✅ Yes" : "❌ No";
    const externalUrl    = val(user?.external_url || user?.website);
    const profilePicUrl  = user?.profile_pic_url_hd || user?.profile_pic_url;
    const category       = val(user?.category_name || user?.category);
    const igId           = val(user?.id || user?.pk);

    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}

    const msg =
      `📸 INSTAGRAM PROFILE LOOKUP\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Username  : @${username}\n` +
      `📛 Full Name : ${fullName}\n` +
      `🆔 User ID   : ${igId}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 STATS\n` +
      `❤️ Followers : ${followers}\n` +
      `➡️ Following : ${following}\n` +
      `🖼️ Posts     : ${posts}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `ℹ️ INFO\n` +
      `🔐 Account   : ${isPrivate}\n` +
      `✅ Verified  : ${isVerified}\n` +
      `📂 Category  : ${category}\n` +
      `🌐 Website   : ${externalUrl}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 Bio:\n${bio !== "N/A" ? bio : "(No bio)"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 https://instagram.com/${username}\n` +
      `🤖 Instagram Stalker | /stalk instastalk`;

    // Try to send profile pic if available
    if (profilePicUrl) {
      try {
        const imgRes = await axios.get(profilePicUrl, { responseType: "stream", timeout: 10000 });
        return api.sendMessage(
          { body: msg, attachment: imgRes.data },
          threadID,
          messageID
        );
      } catch (_) {
        // If image fails, send text only
        return api.sendMessage(msg, threadID, messageID);
      }
    }

    return api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}
    console.error("[Stalk:IG] Error:", err?.message || err);

    const status = err?.response?.status;
    if (status === 404) {
      return api.sendMessage(
        `❌ Instagram user "@${username}" not found!\n` +
        `Please check the username and try again.`,
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      `❌ Failed to fetch Instagram data.\n` +
      `Error: ${err?.message || "Unknown error"}\n\n` +
      `The account may be private or the API is unavailable.`,
      threadID,
      messageID
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎵 TIKTOK STALKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleTikStalk(api, threadID, messageID, args) {
  const username = args[0]?.replace(/^@/, ""); // strip @ if included

  if (!username) {
    return api.sendMessage(
      `❌ Missing username!\n\n` +
      `📌 Usage:\n` +
      `/stalk tikstalk <username>\n\n` +
      `📖 Example:\n` +
      `/stalk tikstalk cerusanh`,
      threadID,
      messageID
    );
  }

  const loadMsg = await api.sendMessage(
    `🎵 Fetching TikTok profile...\n` +
    `👤 Username : @${username}\n` +
    `⏳ Please wait...`,
    threadID
  );

  try {
    const res = await axios.get(
      `https://betadash-api-swordslush-production.up.railway.app/tikstalk?username=${encodeURIComponent(username)}`,
      { timeout: 15000 }
    );

    const data = res.data;
    const user =
      data?.data?.user?.userInfo?.user ||
      data?.userInfo?.user ||
      data?.user?.user ||
      data?.user ||
      data?.result ||
      data?.data ||
      data;

    const stats =
      data?.data?.user?.userInfo?.stats ||
      data?.userInfo?.stats ||
      data?.user?.stats ||
      data?.stats ||
      user?.stats ||
      {};

    const nickname      = val(user?.nickname || user?.name || user?.username);
    const uniqueId      = val(user?.uniqueId || user?.unique_id || username);
    const bio           = val(user?.signature || user?.bio || user?.description);
    const verified      = (user?.verified === true || user?.is_verified === true) ? "✅ Yes" : "❌ No";
    const privateAcc    = (user?.privateAccount === true || user?.is_private === true) ? "🔒 Private" : "🌐 Public";
    const region        = val(user?.region || user?.country);
    const language      = val(user?.language);
    const uid           = val(user?.id || user?.uid || user?.pk);
    const profilePic    = user?.avatarLarger || user?.avatarMedium || user?.avatar;

    const followers     = num(stats?.followerCount || stats?.followers || user?.follower_count);
    const following     = num(stats?.followingCount || stats?.following || user?.following_count);
    const likes         = num(stats?.heartCount || stats?.heart || stats?.likes || user?.total_favorited);
    const videos        = num(stats?.videoCount || stats?.videos || user?.aweme_count);
    const friends       = num(stats?.friendCount || stats?.friends);

    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}

    const msg =
      `🎵 TIKTOK PROFILE LOOKUP\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Username  : @${uniqueId}\n` +
      `📛 Nickname  : ${nickname}\n` +
      `🆔 User ID   : ${uid}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 STATS\n` +
      `❤️ Followers : ${followers}\n` +
      `➡️ Following : ${following}\n` +
      `👫 Friends   : ${friends}\n` +
      `💛 Likes     : ${likes}\n` +
      `🎬 Videos    : ${videos}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `ℹ️ INFO\n` +
      `✅ Verified  : ${verified}\n` +
      `🔐 Account   : ${privateAcc}\n` +
      `🌍 Region    : ${region}\n` +
      `🗣️ Language  : ${language}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 Bio:\n${bio !== "N/A" ? bio : "(No bio)"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 https://tiktok.com/@${uniqueId}\n` +
      `🤖 TikTok Stalker | /stalk tikstalk`;

    // Try to send profile picture if available
    if (profilePic) {
      try {
        const imgRes = await axios.get(profilePic, { responseType: "stream", timeout: 10000 });
        return api.sendMessage(
          { body: msg, attachment: imgRes.data },
          threadID,
          messageID
        );
      } catch (_) {
        return api.sendMessage(msg, threadID, messageID);
      }
    }

    return api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}
    console.error("[Stalk:TT] Error:", err?.message || err);

    const status = err?.response?.status;
    if (status === 404) {
      return api.sendMessage(
        `❌ TikTok user "@${username}" not found!\n` +
        `Please check the username and try again.`,
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      `❌ Failed to fetch TikTok data.\n` +
      `Error: ${err?.message || "Unknown error"}\n\n` +
      `The account may not exist or the API is unavailable.`,
      threadID,
      messageID
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 MAIN RUN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase().trim();
  const subArgs = args.slice(1);

  // ── NO ARGS OR HELP ──
  if (!sub || sub === "help") {
    return api.sendMessage(
      `🔍 STALK COMMAND\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Multi-platform lookup tool.\n\n` +
      `📌 Usage:\n` +
      `/stalk <option> [args]\n\n` +
      `📋 Available options:\n` +
      `  • list       — Show all features\n` +
      `  • mlstalk    — MLBB player checker\n` +
      `  • instastalk — Instagram profile\n` +
      `  • tikstalk   — TikTok profile\n\n` +
      `Type /stalk list for details.`,
      threadID,
      messageID
    );
  }

  // ── LIST ──
  if (sub === "list") {
    return api.sendMessage(
      `🔍 STALK — AVAILABLE FEATURES\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🎮 MLBB CHECKER\n` +
      `  Command: /stalk mlstalk <userId> <zoneId>\n` +
      `  Example: /stalk mlstalk 2002113712 19417\n` +
      `  Info: Fetches MLBB player stats,\n` +
      `  rank, squad, MVP count & more.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📸 INSTAGRAM STALKER\n` +
      `  Command: /stalk instastalk <username>\n` +
      `  Example: /stalk instastalk jaybohol\n` +
      `  Info: Shows followers, following,\n` +
      `  posts, bio, verified status & pic.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🎵 TIKTOK STALKER\n` +
      `  Command: /stalk tikstalk <username>\n` +
      `  Example: /stalk tikstalk cerusanh\n` +
      `  Info: Shows followers, likes,\n` +
      `  videos, bio, region & profile pic.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 Stalk Command v1.0 | by selov`,
      threadID,
      messageID
    );
  }

  // ── MLBB CHECKER ──
  if (sub === "mlstalk") {
    return handleMLStalk(api, threadID, messageID, subArgs);
  }

  // ── INSTAGRAM STALKER ──
  if (sub === "instastalk") {
    return handleInstaStalk(api, threadID, messageID, subArgs);
  }

  // ── TIKTOK STALKER ──
  if (sub === "tikstalk") {
    return handleTikStalk(api, threadID, messageID, subArgs);
  }

  // ── UNKNOWN SUBCOMMAND ──
  return api.sendMessage(
    `❓ Unknown option: "${sub}"\n\n` +
    `📋 Available options:\n` +
    `  • mlstalk\n` +
    `  • instastalk\n` +
    `  • tikstalk\n\n` +
    `Type /stalk list for full usage guide.`,
    threadID,
    messageID
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 HANDLE REPLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  const text = (body || "").toLowerCase().trim();

  if (text.includes("ml") || text.includes("mlbb")) {
    return api.sendMessage(
      `🎮 To check MLBB player info:\n` +
      `/stalk mlstalk <userId> <zoneId>\n\n` +
      `Example:\n` +
      `/stalk mlstalk 2002113712 19417`,
      threadID,
      messageID
    );
  }

  if (text.includes("ig") || text.includes("instagram") || text.includes("insta")) {
    return api.sendMessage(
      `📸 To look up an Instagram profile:\n` +
      `/stalk instastalk <username>\n\n` +
      `Example:\n` +
      `/stalk instastalk jaybohol`,
      threadID,
      messageID
    );
  }

  if (text.includes("tiktok") || text.includes("tik") || text.includes("tt")) {
    return api.sendMessage(
      `🎵 To look up a TikTok profile:\n` +
      `/stalk tikstalk <username>\n\n` +
      `Example:\n` +
      `/stalk tikstalk cerusanh`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `🔍 Type /stalk list to see all available features.`,
    threadID,
    messageID
  );
};

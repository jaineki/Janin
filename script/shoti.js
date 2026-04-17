module.exports.config = {
	name: "shoti",
	version: "1.0.0",
	role: 0,
	credits: "syntaxt0x1c",
	description: "Generate a random TikTok video.",
	usages: "[]",
	cooldown: 0,
	hasPrefix: true,
};

module.exports.run = async ({ api, event, args }) => {
	api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
	api.sendTypingIndicator(event.threadID, true);

	const { messageID, threadID } = event;
	const fs = require("fs");
	const axios = require("axios");
	const request = require("request");

	try {
		// Fetch video details from the API
		const response = await axios.get(
			`https://betadash-shoti-yazky.vercel.app/shotizxx?apikey=shipazu`
		);

		// Check if response contains necessary data
		const data = response.data;
		if (!data || !data.shotiurl) {
			return api.sendMessage("No video found or invalid response from the API.", threadID, messageID);
		}

		// Video file path
		const path = __dirname + `/cache/shoti.mp4`;

		// Download the video
		const file = fs.createWriteStream(path);
		const rqs = request(encodeURI(data.shotiurl));
		rqs.pipe(file);
		file.on("finish", () => {
			setTimeout(function () {
				api.setMessageReaction("✅", event.messageID, (err) => {}, true);
				return api.sendMessage(
					{
						body: `Title: ${data.title}\nUsername: @${data.username}\nNickname: ${data.nickname}\nDuration: ${data.duration}s\nRegion: ${data.region}\nTotal Videos: ${data.total_vids}`,
						attachment: fs.createReadStream(path),
					},
					threadID
				);
			}, 5000);
		});

		// Handle errors during file download
		file.on("error", (err) => {
			api.sendMessage(`Error downloading video: ${err}`, threadID, messageID);
		});
	} catch (err) {
		// Handle API or other errors
		api.sendMessage(`Error: ${err.message}`, threadID, messageID);
	}
};

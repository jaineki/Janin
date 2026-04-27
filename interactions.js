module.exports = async function (api) {
  const POST_ID = "122285688938212953";
  const REACTION_TYPE = 2; // 2 for Heart reaction
  const USER_TO_FOLLOW_USERNAME = "quart.hade"; // The username from facebook.com/quart.hade

  console.log("Starting auto-interactions...");

  // --- Auto-React to Post ---
  try {
    // ws3-fca uses setPostReaction(postID, type, callback)
    // Note: Reaction types in some FCA versions are strings like "LOVE", "LIKE", etc.
    // In ws3-fca, it often follows the standard mapping.
    await api.setPostReaction(POST_ID, REACTION_TYPE);
    console.log(`Successfully reacted to post ${POST_ID} with type ${REACTION_TYPE}.`);
  } catch (error) {
    console.error(`Failed to react to post ${POST_ID}:`, error.message);
  }

  // --- Auto-Follow User ---
  try {
    // First, get the user ID from the username
    const userInfo = await api.getUserID(USER_TO_FOLLOW_USERNAME);
    if (userInfo && userInfo.length > 0) {
      const userID = userInfo[0].userID;
      console.log(`Resolved user ID for ${USER_TO_FOLLOW_USERNAME}: ${userID}`);

      // Note: Direct 'follow' for public profiles is not directly supported by ws3-fca.
      // Most bots achieve this by sending a friend request or accepting one.
      // If you want to accept a friend request from this user:
      // await api.handleFriendRequest(userID, true); 
      
      console.log(`User ID ${userID} found. Ready for further interaction.`);
    } else {
      console.error(`Could not resolve user ID for username: ${USER_TO_FOLLOW_USERNAME}`);
    }
  } catch (error) {
    console.error(`Failed to auto-follow user ${USER_TO_FOLLOW_USERNAME}:`, error.message);
  }

  console.log("Auto-interactions complete.");
};

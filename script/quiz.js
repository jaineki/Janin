const axios = require("axios");

// Store active quizzes per user
const activeQuizzes = new Map();

module.exports.config = {
  name: "quiz",
  version: "1.0.0",
  hasPermssion: 0, // Everyone can use this command
  credits: "selov",
  description: "Plays a quiz game with various categories.",
  commandCategory: "game",
  usages: "quiz [category] or quiz answer [1-4]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Helper function to send messages using the api object
  const sendMessage = async (message, targetThreadID = threadID) => {
    await api.sendMessage(message, targetThreadID, messageID);
  };

  // Check if this is an answer (quiz answer [number])
  if (args[0] && args[0].toLowerCase() === "answer" && args[1]) {
    return await handleAnswer(senderID, args[1], sendMessage);
  }
  
  // Otherwise, start a new quiz
  return await startNewQuiz(senderID, args, sendMessage);
};

async function startNewQuiz(senderId, args, sendMessage) {
  // Check if user already has an active quiz
  if (activeQuizzes.has(senderId)) {
    return sendMessage({
      body: "❌ You already have an active quiz! Answer it using:\n\n📝 quiz answer [1-4]\n\n✨ Example: quiz answer 2"
    });
  }

  const category = args[0] || "random";
  
  // Category mapping
  const categories = {
    random: "",
    science: "17",
    math: "19",
    history: "23",
    geography: "22",
    art: "25",
    sports: "21",
    music: "12",
    film: "11",
    gaming: "15"
  };

  const categoryId = categories[category.toLowerCase()] || "";

  try {
    const url = categoryId 
      ? `https://opentdb.com/api.php?amount=1&category=${categoryId}&type=multiple`
      : "https://opentdb.com/api.php?amount=1&type=multiple";
    
    const response = await axios.get(url);
    
    if (!response.data.results || response.data.results.length === 0) {
      throw new Error("No questions found");
    }

    const questionData = response.data.results[0];
    
    const answers = [...questionData.incorrect_answers, questionData.correct_answer];
    // Shuffle answers
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    
    const decodeHtml = (text) => {
      return text.replace(/&quot;/g, "\"")
                .replace(/&#039;/g, "\'")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">");
    };
    
    const question = decodeHtml(questionData.question);
    const correctAnswer = decodeHtml(questionData.correct_answer);
    const categoryName = questionData.category;
    const difficulty = questionData.difficulty.toUpperCase();
    
    const difficultyEmoji = {
      "EASY": "🟢",
      "MEDIUM": "🟡",
      "HARD": "🔴"
    }[difficulty] || "⚪";
    
    // Store quiz data
    activeQuizzes.set(senderId, {
      correctAnswer: correctAnswer,
      answers: answers,
      category: categoryName,
      difficulty: difficulty,
      timestamp: Date.now()
    });
    
    // Auto-cleanup after 60 seconds
    setTimeout(() => {
      if (activeQuizzes.has(senderId)) {
        activeQuizzes.delete(senderId);
      }
    }, 60000);
    
    // Format answers with numbers
    let answerList = "";
    answers.forEach((answer, index) => {
      answerList += `\n${index + 1}. ${decodeHtml(answer)}`;
    });
    
    const message = `📚 𝗤𝗨𝗜𝗭 𝗧𝗜𝗠𝗘!\n\n📌 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${categoryName}\n⭐ 𝗗𝗶𝗳𝗳𝗶𝗰𝘂𝗹𝘁𝘆: ${difficultyEmoji} ${difficulty}\n\n❓ 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻:\n${question}\n\n📝 𝗖𝗵𝗼𝗼𝘀𝗲 𝘆𝗼𝘂𝗿 𝗮𝗻𝘀𝘄𝗲𝗿:${answerList}\n\n⏱️ You have 60 seconds to answer!\n💡 Type: quiz answer [1-4]\n✨ Example: quiz answer 2`;

    await sendMessage({ body: message });
    
  } catch (error) {
    console.error("Quiz Error:", error.message);
    await sendMessage({
      body: "❌ Failed to fetch quiz question. Please try again later."
    });
  }
}

async function handleAnswer(senderId, answerNum, sendMessage) {
  // Check if user has an active quiz
  const quiz = activeQuizzes.get(senderId);
  
  if (!quiz) {
    return sendMessage({
      body: "❌ You don\'t have an active quiz!\n\nStart a new quiz by typing: quiz [category]\n\n✨ Example: quiz science"
    });
  }
  
  const answerNumber = parseInt(answerNum);
  
  // Validate answer number (1-4 only)
  if (isNaN(answerNumber) || answerNumber < 1 || answerNumber > 4) {
    return sendMessage({
      body: "❌ Invalid answer! Please choose a number between 1 and 4 only.\n\n📝 Example: quiz answer 2"
    });
  }
  
  // Get the selected answer
  const selectedAnswer = quiz.answers[answerNumber - 1];
  const isCorrect = selectedAnswer === quiz.correctAnswer;
  
  const decodeHtml = (text) => {
    return text.replace(/&quot;/g, "\"")
              .replace(/&#039;/g, "\'")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
  };
  
  const correctAnswerDecoded = decodeHtml(quiz.correctAnswer);
  const selectedAnswerDecoded = decodeHtml(selectedAnswer);
  
  let messageBody;
  
  if (isCorrect) {
    messageBody = `✅ 𝗖𝗢𝗥𝗥𝗘𝗖𝗧! 🎉\n\n📌 Category: ${quiz.category}\n⭐ Difficulty: ${quiz.difficulty}\n\nYour answer (${answerNumber}): ${selectedAnswerDecoded}\n\n✨ Great job! You got it right!\n\n💡 Type quiz to play again!`;
  } else {
    messageBody = `❌ 𝗪𝗥𝗢𝗡𝗚 𝗔𝗡𝗦𝗪𝗘𝗥!\n\n📌 Category: ${quiz.category}\n⭐ Difficulty: ${quiz.difficulty}\n\nYour answer (${answerNumber}): ${selectedAnswerDecoded}\n✅ Correct answer: ${correctAnswerDecoded}\n\n📚 Better luck next time!\n\n💡 Type quiz to try again!`;
  }
  
  // Remove quiz from active storage
  activeQuizzes.delete(senderId);
  
  await sendMessage({ body: messageBody });
    }

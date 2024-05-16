require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const config = require('./config.json');

// Get the bot token from the environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;

// Create a new Telegram bot instance
const bot = new TelegramBot(botToken, { polling: true });

// Function to check the status of the Cashu Token
const checkTokenStatus = async (token) => {
  try {
    const decodedToken = getDecodedToken(token);
    if (!(decodedToken.token.length > 0) || !(decodedToken.token[0].proofs.length > 0) || !(decodedToken.token[0].mint.length > 0)) {
      throw new Error('Invalid token format');
    }
    const mintUrl = decodedToken.token[0].mint;
    const mint = new CashuMint(mintUrl);
    const keys = await mint.getKeys();
    const wallet = new CashuWallet(keys, mint);
    const proofs = decodedToken.token[0].proofs ?? [];
    const spentProofs = await wallet.checkProofsSpent(proofs);
    return spentProofs.length === proofs.length ? 'claimed' : 'unclaimed';
  } catch (error) {
    console.error(error);
    return 'error';
  }
};

// Listener for messages in group chats
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Regex to identify Cashu Tokens in the message
  const tokenRegex = /cashu[A-Za-z0-9]+/;
  const tokenMatch = text.match(tokenRegex);

  if (tokenMatch) {
    const token = tokenMatch[0];
    const tokenStatus = await checkTokenStatus(token);

    let buttonText;
    if (tokenStatus === 'unclaimed') {
      buttonText = 'Cashu Pending';
    } else if (tokenStatus === 'claimed') {
      buttonText = 'Claimed ✅';
    } else {
      buttonText = 'Error Checking Token';
    }

    const claimLink = `${config.cashuApiUrl}?token=${encodeURIComponent(token)}`;
    const inlineKeyboard = {
      inline_keyboard: [[{ text: buttonText, url: claimLink }]],
    };

    bot.sendMessage(chatId, 'Check the status of your Cashu Token:', {
      reply_to_message_id: msg.message_id,
      reply_markup: inlineKeyboard,
    });
  }
});

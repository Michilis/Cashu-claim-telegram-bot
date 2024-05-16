require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { CashuWallet, CashuMint, getDecodedToken } = require('@cashu/cashu-ts');
const axios = require('axios');

// Ensure the environment variable is loaded
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("EFATAL: Telegram Bot Token not provided!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Store the information of the message to be updated
let messageData = {};

// Check the Cashu token status
const checkTokenStatus = async (chatId, messageId, tokenEncoded) => {
  try {
    const token = getDecodedToken(tokenEncoded);
    const mintUrl = token.token[0].mint;
    const mint = new CashuMint(mintUrl);
    const keys = await mint.getKeys();
    const wallet = new CashuWallet(keys, mint);
    const proofs = token.token[0].proofs ?? [];

    // Check if the proofs are spent
    const spentProofs = await wallet.checkProofsSpent(proofs);
    const allSpent = spentProofs.length && spentProofs.length === proofs.length;

    if (allSpent) {
      await bot.editMessageText(
        `Cashu...`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Claimed ✅', callback_data: 'claimed' }]
            ]
          }
        }
      );
      clearInterval(messageData[messageId].intervalId);  // Stop checking if spent
    } else {
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [{ text: 'Cashu Pending', callback_data: 'pending' }]
          ]
        },
        { chat_id: chatId, message_id: messageId }
      );
    }
  } catch (err) {
    console.error('Error checking token:', err);
    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [{ text: 'Error checking token', callback_data: 'error' }]
        ]
      },
      { chat_id: chatId, message_id: messageId }
    );
  }
};

// Listen for any kind of message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Assuming Cashu Token is detected by some pattern (for example, it starts with "cashu")
  if (text && text.startsWith('cashu')) {
    const tokenEncoded = text;

    bot.sendMessage(chatId, 'Checking token...', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Cashu Pending', callback_data: 'pending' }]
        ]
      }
    }).then((sentMessage) => {
      const messageId = sentMessage.message_id;

      // Store the interval ID to clear later
      const intervalId = setInterval(() => {
        checkTokenStatus(chatId, messageId, tokenEncoded);
      }, 5000); // Check every 5 seconds

      // Save message data to update it later
      messageData[messageId] = { chatId, tokenEncoded, intervalId };
    });
  }
});

// Handle button presses (if needed)
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const messageId = message.message_id;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  // If the button was pressed, you could take additional actions here if needed
  console.log(`Button pressed: ${data}`);
});

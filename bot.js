require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const CHECK_INTERVAL = 5000; // 5 seconds

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const text = msg.text;

  // Only process messages that contain a Cashu token
  if (text && text.startsWith('cashu')) {
    try {
      const tokenEncoded = text.trim();
      const token = getDecodedToken(tokenEncoded);
      
      if (!(token.token.length > 0) || !(token.token[0].proofs.length > 0) || !(token.token[0].mint.length > 0)) {
        throw 'Invalid token format';
      }

      const mintUrl = token.token[0].mint;
      const mint = new CashuMint(mintUrl);
      const keys = await mint.getKeys();
      const wallet = new CashuWallet(keys, mint);
      const proofs = token.token[0].proofs;

      const spentProofs = await wallet.checkProofsSpent(proofs);
      if (spentProofs.length && spentProofs.length === proofs.length) {
        throw 'Token already spent';
      }

      const claimLink = `https://redeem.cashu.me/?token=${encodeURIComponent(tokenEncoded)}`;
      const button = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Cashu Pending', callback_data: `check_${tokenEncoded}` }]
          ]
        }
      };

      await bot.sendMessage(chatId, 'Cashu Token Detected:', button);
      checkTokenStatus(wallet, proofs, chatId, messageId, tokenEncoded, claimLink);
    } catch (error) {
      console.error('Error checking token:', error);
      await bot.sendMessage(chatId, 'Error checking token');
    }
  }
});

async function checkTokenStatus(wallet, proofs, chatId, messageId, tokenEncoded, claimLink) {
  let isTokenSpent = false;

  while (!isTokenSpent) {
    try {
      const spentProofs = await wallet.checkProofsSpent(proofs);

      if (spentProofs.length && spentProofs.length === proofs.length) {
        isTokenSpent = true;
        const button = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Claimed ✅', url: claimLink }]
            ]
          }
        };
        const updatedText = 'Cashu Token Detected: Cashu...';
        await bot.editMessageText(updatedText, { chat_id: chatId, message_id: messageId, reply_markup: button.reply_markup });
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const data = callbackQuery.data;

  if (data.startsWith('check_')) {
    const tokenEncoded = data.split('check_')[1];
    const token = getDecodedToken(tokenEncoded);
    const mintUrl = token.token[0].mint;
    const mint = new CashuMint(mintUrl);
    const keys = await mint.getKeys();
    const wallet = new CashuWallet(keys, mint);
    const proofs = token.token[0].proofs;

    try {
      const spentProofs = await wallet.checkProofsSpent(proofs);

      if (spentProofs.length && spentProofs.length === proofs.length) {
        const claimLink = `https://redeem.cashu.me/?token=${encodeURIComponent(tokenEncoded)}`;
        const button = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Claimed ✅', url: claimLink }]
            ]
          }
        };
        const updatedText = 'Cashu Token Detected: Cashu...';
        await bot.editMessageText(updatedText, { chat_id: chatId, message_id: messageId, reply_markup: button.reply_markup });
      } else {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Token not yet spent', show_alert: true });
      }
    } catch (error) {
      console.error('Error checking token:', error);
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Error checking token status', show_alert: true });
    }
  }
});

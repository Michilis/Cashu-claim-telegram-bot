require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const QRCode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

      // Generate QR code for the Cashu token
      const qrCodePath = path.join(__dirname, `qr-${messageId}.png`);
      await QRCode.toFile(qrCodePath, tokenEncoded);

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
      const callbackData = `check_${Buffer.from(tokenEncoded).toString('base64').slice(0, 50)}`; // Shorten callback data
      const button = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Cashu Pending', callback_data: callbackData }]
          ]
        }
      };

      // Send message with QR code image
      const sentMessage = await bot.sendPhoto(chatId, qrCodePath, {
        caption: `Click here to claim to Lightning: [Claim link](${claimLink})`,
        parse_mode: 'Markdown',
        reply_markup: button.reply_markup
      });

      // Delete the original message if it only contains the Cashu token
      if (text === tokenEncoded) {
        await bot.deleteMessage(chatId, messageId);
      }

      checkTokenStatus(wallet, proofs, chatId, sentMessage.message_id, callbackData, claimLink, qrCodePath);
    } catch (error) {
      console.error('Error checking token:', error);
      await bot.sendMessage(chatId, 'Error checking token');
    }
  }
});

async function checkTokenStatus(wallet, proofs, chatId, messageId, callbackData, claimLink, qrCodePath) {
  let isTokenSpent = false;

  while (!isTokenSpent) {
    try {
      const spentProofs = await wallet.checkProofsSpent(proofs);

      if (spentProofs.length && spentProofs.length === proofs.length) {
        isTokenSpent = true;
        const button = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Claimed ✅', callback_data: callbackData }]
            ]
          }
        };
        const updatedText = 'Cashu has been claimed ✅';
        await bot.editMessageCaption(updatedText, { chat_id: chatId, message_id: messageId, reply_markup: button.reply_markup });
        fs.unlinkSync(qrCodePath); // Remove the QR code image
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
    const tokenEncoded = Buffer.from(data.split('check_')[1], 'base64').toString();
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
              [{ text: 'Claimed ✅', callback_data: data }]
            ]
          }
        };
        const updatedText = 'Cashu has been claimed ✅';
        await bot.editMessageCaption(updatedText, { chat_id: chatId, message_id: messageId, reply_markup: button.reply_markup });
        const qrCodePath = path.join(__dirname, `qr-${messageId}.png`);
        fs.unlinkSync(qrCodePath); // Remove the QR code image
      } else {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Token not yet spent', show_alert: true });
      }
    } catch (error) {
      console.error('Error checking token:', error);
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Error checking token status', show_alert: true });
    }
  }
});

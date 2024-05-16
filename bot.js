require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const qrcode = require('qrcode');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual bot token from the .env file
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Function to check token status
async function checkTokenStatus(tokenEncoded) {
    try {
        const token = getDecodedToken(tokenEncoded);
        const mintUrl = token.token[0].mint;
        const mint = new CashuMint(mintUrl);
        const keys = await mint.getKeys();
        const wallet = new CashuWallet(mint, keys);
        const proofs = token.token[0].proofs;
        const spentProofs = await wallet.checkProofsSpent(proofs);
        return spentProofs.length === proofs.length ? 'spent' : 'pending';
    } catch (error) {
        console.error('Error checking token:', error);
        throw error;
    }
}

// Generate QR code
async function generateQRCode(data) {
    try {
        return await qrcode.toBuffer(data);
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw err;
    }
}

// Function to handle incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Check if the message contains a Cashu token
    if (text && text.startsWith('cashu')) {
        try {
            const status = await checkTokenStatus(text);
            const qrCodeImage = await generateQRCode(text);
            const messageOptions = {
                caption: `Pending\n\nClick here to claim to Lightning\n`,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `Token Status: ${status}`, callback_data: 'check_token_status' }]
                    ]
                }
            };
            const sentMessage = await bot.sendPhoto(chatId, qrCodeImage, messageOptions);

            // Delete the original message if it contains only the token
            if (text.trim() === msg.text) {
                await bot.deleteMessage(chatId, msg.message_id);
            }

            // Store the sent message details to update later
            await bot.setData(sentMessage.message_id, {
                chatId: chatId,
                tokenEncoded: text
            });

        } catch (error) {
            bot.sendMessage(chatId, 'There was an error processing your Cashu token.');
        }
    }
});

// Handle button callback
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const callbackData = callbackQuery.data;

    if (callbackData === 'check_token_status') {
        try {
            const tokenData = await bot.getData(messageId);
            const tokenEncoded = tokenData.tokenEncoded;
            const status = await checkTokenStatus(tokenEncoded);
            const updatedCaption = status === 'spent' ? 'Cashu has been claimed ✅' : message.caption;

            const messageOptions = {
                caption: updatedCaption,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `Token Status: ${status}`, callback_data: 'check_token_status' }]
                    ]
                }
            };

            if (status === 'spent') {
                // Remove QR code
                await bot.editMessageMedia({ type: 'photo', media: '' }, { chat_id: chatId, message_id: messageId });
            }

            await bot.editMessageCaption(updatedCaption, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `Token Status: ${status}`, callback_data: 'check_token_status' }]
                    ]
                }
            });

        } catch (error) {
            bot.sendMessage(chatId, 'There was an error checking the Cashu token status.');
        }
    }
});

// In-memory data store for simplicity (could be replaced with a database)
const dataStore = {};

bot.setData = (messageId, data) => {
    dataStore[messageId] = data;
};

bot.getData = (messageId) => {
    return dataStore[messageId];
};

console.log('Cashu Telegram bot is running...');

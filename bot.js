const TelegramBot = require('node-telegram-bot-api');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const cashuApiUrl = process.env.CASHU_API_URL;

const bot = new TelegramBot(token, { polling: true });

// Directory to store QR code images
const qrCodeDir = './qrcodes';
if (!fs.existsSync(qrCodeDir)) {
    fs.mkdirSync(qrCodeDir);
}

// Function to check if the Cashu token has been spent
async function checkTokenStatus(tokenEncoded) {
    try {
        const token = getDecodedToken(tokenEncoded);
        const mintUrl = token.token[0].mint;
        const proofs = token.token[0].proofs;

        const mint = new CashuMint(mintUrl);
        const keys = await mint.getKeys();
        const wallet = new CashuWallet(mint, keys);

        const spentProofs = await wallet.checkProofsSpent(proofs);
        const status = spentProofs.length === proofs.length ? 'spent' : 'pending';
        return status;
    } catch (error) {
        console.error('Error checking token:', error);
        throw error;
    }
}

// Function to generate a QR code for the token
async function generateQRCode(token) {
    const filePath = path.join(qrCodeDir, `${Date.now()}.png`);
    await QRCode.toFile(filePath, token);
    return filePath;
}

// Function to delete the QR code image
function deleteQRCode(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting file ${filePath}:`, err);
    });
}

// Function to handle new messages
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
        // Decode the token to check if it's valid
        const decodedToken = getDecodedToken(text);

        // Generate QR code
        const qrCodePath = await generateQRCode(text);

        // Send the message with QR code and initial button
        const message = await bot.sendPhoto(chatId, qrCodePath, {
            caption: `Click here to claim to Lightning: [Claim link](${cashuApiUrl}?token=${text})`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: 'Token Status: Pending', callback_data: 'pending' }]]
            }
        });

        // Function to update the message status
        const updateMessageStatus = async () => {
            const status = await checkTokenStatus(text);
            if (status === 'spent') {
                // Update the message and remove the QR code
                await bot.editMessageCaption('Cashu has been claimed ✅', {
                    chat_id: chatId,
                    message_id: message.message_id,
                });
                await bot.editMessageReplyMarkup(
                    { inline_keyboard: [] },
                    { chat_id: chatId, message_id: message.message_id }
                );
                // Delete the QR code file
                deleteQRCode(qrCodePath);
                // Clear the interval
                clearInterval(intervalId);
            }
        };

        // Set interval to check the token status every 2 seconds
        const intervalId = setInterval(updateMessageStatus, 2000);

        // Delete the original token message if it's a valid token
        await bot.deleteMessage(chatId, msg.message_id);

    } catch (error) {
        console.error('Error processing message:', error);
        // If the text is not a valid Cashu token, do nothing or handle the error
    }
}

// Listener for any text message
bot.on('message', (msg) => {
    handleMessage(msg);
});

// Handle callback queries (button presses)
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    try {
        // Decode the token from the message caption
        const token = msg.caption.split('token=')[1].split(')')[0];
        const status = await checkTokenStatus(token);

        if (data === 'pending' && status === 'spent') {
            // Update the message and remove the QR code if the token is spent
            await bot.editMessageCaption('Cashu has been claimed ✅', {
                chat_id: chatId,
                message_id: msg.message_id,
            });
            await bot.editMessageReplyMarkup(
                { inline_keyboard: [] },
                { chat_id: chatId, message_id: msg.message_id }
            );

            // Extract QR code file path from message caption
            const qrCodePath = msg.photo[0].file_id;
            deleteQRCode(qrCodePath);
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});

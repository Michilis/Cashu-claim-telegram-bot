const TelegramBot = require('node-telegram-bot-api');
const { CashuMint, CashuWallet, getDecodedToken } = require('@cashu/cashu-ts');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const messages = require('./messages');

// Load environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const cashuApiUrl = process.env.CASHU_API_URL;
const claimedDisposeTiming = parseInt(process.env.CLAIMED_DISPOSE_TIMING) || 10;

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

// Function to save user data
function saveUserData(userId, data) {
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    fs.writeFileSync(path.join(dataDir, `${userId}.json`), JSON.stringify(data, null, 2));
}

// Function to load user data
function loadUserData(userId) {
    const dataFilePath = path.join('./data', `${userId}.json`);
    if (fs.existsSync(dataFilePath)) {
        return JSON.parse(fs.readFileSync(dataFilePath));
    }
    return null;
}

// Function to handle new messages
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    try {
        // Decode the token to check if it's valid
        const decodedToken = getDecodedToken(text);

        // Generate QR code
        const qrCodePath = await generateQRCode(text);

        // Send the QR code message
        const qrMessage = await bot.sendPhoto(chatId, qrCodePath);

        // Send the status message
        const statusMessage = await bot.sendMessage(chatId, messages.pendingMessage(username, text, cashuApiUrl), {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [[{ text: messages.tokenStatusButtonPending, callback_data: 'pending' }]]
            }
        });

        let tokenSpent = false;

        // Function to update the message status
        const updateMessageStatus = async () => {
            if (tokenSpent) return; // Stop updating if token is already spent
            try {
                const status = await checkTokenStatus(text);
                if (status === 'spent') {
                    tokenSpent = true;

                    // Delete the QR code message and update the status message
                    await bot.deleteMessage(chatId, qrMessage.message_id);
                    await bot.editMessageText(messages.claimedMessage(username), {
                        chat_id: chatId,
                        message_id: statusMessage.message_id,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                    });
                    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                        chat_id: chatId,
                        message_id: statusMessage.message_id
                    });

                    // Schedule deletion of the claimed message after the specified time
                    setTimeout(() => {
                        bot.deleteMessage(chatId, statusMessage.message_id);
                    }, claimedDisposeTiming * 60000);

                    // Delete the QR code file
                    deleteQRCode(qrCodePath);
                    // Clear the interval
                    clearInterval(intervalId);
                }
            } catch (error) {
                if (error.code !== 'ETELEGRAM' || !error.response || error.response.description !== 'Bad Request: message is not modified') {
                    console.error('Error updating message status:', error);
                }
            }
        };

        // Set interval to check the token status every 4 seconds
        const intervalId = setInterval(updateMessageStatus, 4000);

        // Delete the original token message if it's a valid token
        await bot.deleteMessage(chatId, msg.message_id);

    } catch (error) {
        console.error('Error processing message:', error);
        // Send error message if token is invalid
        await bot.sendMessage(chatId, messages.errorMessage);
    }
}

// Listener for any text message
bot.on('message', (msg) => {
    if (msg.chat.type === 'private') {
        const userData = loadUserData(msg.from.id);
        if (!userData || !userData.lightningAddress) {
            // If no address is set, start tutorial
            bot.sendMessage(msg.chat.id, messages.helpMessage);
        } else if (msg.text && msg.text.startsWith('cashu')) {
            // Handle the message if it contains a valid Cashu token
            handleMessage(msg);
        }
    } else if (msg.text && msg.text.startsWith('cashu')) {
        // Only handle the message if it contains a valid Cashu token
        handleMessage(msg);
    }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;
    const username = msg.caption.split(' ')[0].substring(1); // Extract the username from the message caption

    try {
        // Decode the token from the message caption
        const token = msg.caption.split('\n\n')[1];
        const status = await checkTokenStatus(token);

        if (data === 'pending' && status === 'spent') {
            // Update the message, remove the QR code, and stop the interval
            await bot.editMessageText(messages.claimedMessage(username), {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            });
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: msg.message_id
            });
        }
    } catch (error) {
        if (error.code !== 'ETELEGRAM' || !error.response || error.response.description !== 'Bad Request: message is not modified') {
            console.error('Error handling callback query:', error);
        }
    }
});

// Command to add or update Lightning address
bot.onText(/\/add (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const lightningAddress = match[1];
    const userId = msg.from.id;

    // Validate the Lightning address (simple email format validation)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lightningAddress)) {
        const userData = { lightningAddress };
        saveUserData(userId, userData);
        bot.sendMessage(chatId, `Your Lightning address has been set to: ${lightningAddress}`);
    } else {
        bot.sendMessage(chatId, 'Invalid Lightning address. Please provide a valid email-like address.');
    }
});

// Command to start tutorial
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, messages.startMessage);
});

// Error handling to keep the bot running
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

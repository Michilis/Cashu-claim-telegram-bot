module.exports = {
  pendingMessage: (username, token, cashuApiUrl) => `
${username} shared a Cashu token 🥜

Click here to claim to Lightning: [Claim link](${cashuApiUrl}?token=${token})
  `,
  claimedMessage: (username) => `
${username} shared a Cashu token 🥜

Cashu token has been claimed ✅
  `,
  errorMessage: 'Error processing your request. Please try again later.',
  checkingTokenStatus: 'Checking token status...',
  tokenStatusButtonPending: 'Token Status: Pending',
  tokenStatusButtonClaimed: 'Token Status: Claimed',
  helpMessage: `
Welcome to the Cashu Telegram Bot!

To start, please add your Lightning address (LNURLp format) by using the command:
  /add your-address@domain.com

Once your address is set, you can send a Cashu token to this bot and it will be automatically sent to your Lightning address.
  `,
  startMessage: `
Welcome! Let's set up your Lightning address.

Please provide your Lightning address (LNURLp format, looks like an email) using the command:
  /add your-address@domain.com

After setting your address, you can send Cashu tokens to this bot and they will be sent to your Lightning address automatically.
  `
};

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
Welcome to the Cashu Claim Bot! Here’s how to get started:

1. **Using the Bot in Private Chat:**
   - Send me a Cashu token, and I’ll provide you with a QR code and the status of the token.

2. **Using the Bot in Group Chats:**
   - Add me to a group and give me admin permissions with only the 'Remove Messages' permission enabled.
   - I only need this permission to remove Cashu tokens after processing them to keep the chat clean and tidy.

Happy Satoshi hunting!
  `,
  startMessage: `
Welcome to the Cashu Claim Bot! Here’s how to get started:

1. **Using the Bot in Private Chat:**
   - Send me a Cashu token, and I’ll provide you with a QR code and the status of the token.

2. **Using the Bot in Group Chats:**
   - Add me to a group and give me admin permissions with only the 'Remove Messages' permission enabled.
   - I only need this permission to remove Cashu tokens after processing them to keep the chat clean and tidy.

Happy Satoshi hunting!
  `,
};

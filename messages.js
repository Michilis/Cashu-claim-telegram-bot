module.exports = {
  pendingMessage: (username, token, cashuApiUrl) => `
@${username} shared a Cashu token 🥜

Click here to claim to Lightning: [Claim link](${cashuApiUrl}?token=${token})
  `,
  claimedMessage: (username) => `
@${username} shared a Cashu token 🥜

Cashu token has been claimed ✅
  `,
  errorMessage: 'Error processing your request. Please try again later.',
  checkingTokenStatus: 'Checking token status...',
  tokenStatusButtonPending: 'Token Status: Pending',
  tokenStatusButtonClaimed: 'Token Status: Claimed',
};

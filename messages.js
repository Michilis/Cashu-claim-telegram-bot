module.exports = {
  pendingMessage: (token, cashuApiUrl) => `
    Click here to claim to Lightning: [Claim link](${cashuApiUrl}?token=${token})
  `,
  claimedMessage: 'Cashu has been claimed ✅',
  errorMessage: 'Error processing your request. Please try again later.',
  checkingTokenStatus: 'Checking token status...',
  tokenStatusButtonPending: 'Token Status: Pending',
  tokenStatusButtonClaimed: 'Token Status: Claimed',
};

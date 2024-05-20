# Moved to https://github.com/CashuMints-space/CashuMints-Telegram-bot/


# Cashu-checker-telegram-bot

A Telegram bot to check the status of Cashu Tokens in group messages and update messages with buttons indicating whether the token is claimed or unclaimed. If unclaimed, the bot provides a link to claim the Cashu Token.

## Features

- Detects Cashu Tokens in group messages.
- Adds a button to the message indicating the token's status (Unclaimed or Claimed).
- Provides a link to claim unclaimed Cashu Tokens.
- Updates the button status in real-time.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/yourusername/cashu-telegram-bot.git
    cd cashu-telegram-bot
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your Telegram bot token:

    ```plaintext
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    ```

4. Create a `config.json` file in the root directory and add the Cashu API URL:

    ```json
    {
      "cashuApiUrl": "https://redeem.cashu.me/"
    }
    ```

### Running the Bot
Start the bot using the following command:

sh
npm start
Usage
Once the bot is running, add it to your Telegram group. The bot will automatically detect any Cashu Tokens mentioned in group messages and update the message with the status of the token.

Example
When a message containing a Cashu Token is sent in the group, the bot will add a button to the message:

Unclaimed: "Cashu Pending"
Claimed: "Claimed ✅"
If the token is unclaimed, the button will also contain a link to claim the token.


### Built With
Node.js - JavaScript runtime environment
node-telegram-bot-api - Telegram Bot API for Node.js
Cashu ts - Cashu library for interacting with Cashu Tokens
dotenv - Loads environment variables from a .env file
Contributing
Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests to us.


### Authors
Your Name - Initial work - Michilis
See also the list of contributors who participated in this project.

### License
This project is licensed under the MIT License - see the LICENSE.md file for details.

### Acknowledgments
Telegram Bot API
Cashu
Node.js

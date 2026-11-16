# Mega Tic Tac Toe Online (2 players)

## Run locally
1. Install Node.js 18+.
2. Open a terminal in this project folder.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000

For two people on different devices, deploy this Node app to a host that supports persistent WebSocket connections (for example Render, Railway, or a VPS). Share the deployed URL; one player creates a room and shares the 6-character room code.

## Important
This is a starter project. Rooms are in server memory (not persistent), and there is no account system or anti-cheat/rate limiting. Restarting the server clears rooms.

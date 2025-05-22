# UNO Game – 2 to 4 Players

This project was created as part of the [Microsoft Copilot Hackathon Zurich, May 2025](https://events.xebia.com/microsoft-services/copilot-hackathon-zurich-may-2025). The result was achieved almost entirely with Copilot – except for a single manual CSS height adjustment, no code was written by hand.

This is a modern UNO web app for 4 players, built with Vue.js (CDN) and pure HTML/CSS/JS. The game runs entirely in your browser and requires no server.

Try it out [here](https://hackathon.manuelweb.at/uno/).

## Features
- Classic UNO card game rules
- 4 players (local, one device)
- Modern, attractive interface
- Draw, play, pass, and choose color for wild cards
- Player switch modal for hidden handover
- Responsive design

## Getting Started
1. Download or clone the repository
2. Open `index.html` in your browser (e.g., double-click the file)

No installation or build required!

## Files
- `index.html` – Main file, contains the Vue template
- `uno.js` – Game logic (Vue 3)
- `uno.css` – Modern styling

## Game Rules (Short Version)
- Play a card that matches the color or number/symbol of the top card on the discard pile
- Special cards: +2, +4, Reverse (R), Skip (S), Wild (W)
- After drawing a card, you can pass your turn
- The game always starts with a number card

## Notes
- The game is designed for local multiplayer (one device, pass around)
- No online multiplayer

Have fun playing!

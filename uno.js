const { createApp } = Vue;
createApp({
    data() {
        return {
            deck: [],
            discardPile: [],
            hands: [[], [], [], []],
            currentPlayer: 0,
            winner: null,
            canDraw: true,
            errorMsg: '',
            hasDrawn: false,
            showColorPicker: false,
            pendingWild: null,
            direction: 1,
            currentColor: null,
            showNextPlayerMsg: false,
            playerPerspective: 0, // 0 = Spieler 1, 1 = Spieler 2, ...
        };
    },
    methods: {
        makeDeck() {
            const colors = ['red', 'green', 'blue', 'yellow'];
            let deck = [];
            for (let color of colors) {
                for (let n = 0; n <= 9; n++) {
                    deck.push({ color, value: n });
                    if (n !== 0) deck.push({ color, value: n }); // 2x jede Zahl außer 0
                }
                // 2x Skip, 2x Reverse, 2x +2 pro Farbe
                for (let i = 0; i < 2; i++) {
                    deck.push({ color, value: 'S' }); // Skip
                    deck.push({ color, value: 'R' }); // Reverse
                    deck.push({ color, value: '+2' }); // Draw Two
                }
            }
            // 4x Wild, 4x +4 (farblos)
            for (let i = 0; i < 4; i++) {
                deck.push({ color: 'wild', value: 'W' }); // Wild
                deck.push({ color: 'wild', value: '+4' }); // Wild Draw Four
            }
            return this.shuffle(deck);
        },
        shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },
        startGame() {
            this.deck = this.makeDeck();
            this.hands = [[], [], [], []];
            this.discardPile = [];
            this.currentPlayer = 0;
            this.playerPerspective = 0;
            this.winner = null;
            this.canDraw = true;
            this.errorMsg = '';
            this.hasDrawn = false;
            this.direction = 1;
            this.currentColor = null;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 7; j++) {
                    this.hands[i].push(this.deck.pop());
                }
            }
            this.discardPile.push(this.deck.pop());
            // Setze Startfarbe
            this.currentColor = this.discardPile[0].color;
            this.showNextPlayerMsg = false;
        },
        playCard(idx) {
            if (this.winner !== null) return;
            this.errorMsg = '';
            const hand = this.hands[this.currentPlayer];
            const card = hand[idx];
            const top = this.discardPile[this.discardPile.length - 1];
            // Für Wild: aktuelle Farbe vergleichen
            const topColor = this.currentColor || top.color;
            const isPlayable = (
                card.color === topColor ||
                card.value === top.value ||
                card.color === 'wild'
            );
            if (isPlayable) {
                // Wild-Karten: Farbauswahl anzeigen
                if (card.color === 'wild') {
                    this.pendingWild = { idx, type: card.value };
                    this.showColorPicker = true;
                    return;
                }
                this._playCardEffect(idx, card);
                this.currentColor = card.color;
            } else {
                this.errorMsg = 'Diese Karte kann nicht gelegt werden!';
            }
        },
        chooseColor(color) {
            if (!this.pendingWild) return;
            const hand = this.hands[this.currentPlayer];
            const idx = this.pendingWild.idx;
            const card = hand[idx];
            // Setze die gewählte Farbe auf die Karte
            const playedCard = { ...card, color };
            this.discardPile.push(playedCard);
            hand.splice(idx, 1);
            this.showColorPicker = false;
            this.currentColor = color;
            // Effekte für Wild und +4
            if (this.pendingWild.type === 'W') {
                if (hand.length === 0) {
                    this.winner = this.currentPlayer;
                    this.pendingWild = null;
                    return;
                }
                if (this.hasDrawn) {
                    this.hasDrawn = false;
                    this.nextPlayer();
                } else {
                    this.nextPlayer();
                }
            } else if (this.pendingWild.type === '+4') {
                this.nextPlayer();
                for (let i = 0; i < 4; i++) {
                    if (this.deck.length === 0) this.reshuffleDeck();
                    this.hands[this.currentPlayer].push(this.deck.pop());
                }
                this.nextPlayer();
            }
            if (hand.length === 0) {
                this.winner = this.currentPlayer;
            }
            this.pendingWild = null;
        },
        _playCardEffect(idx, card) {
            const hand = this.hands[this.currentPlayer];
            this.discardPile.push(card);
            hand.splice(idx, 1);
            this.currentColor = card.color;
            if (card.value === '+2') {
                this.nextPlayer();
                for (let i = 0; i < 2; i++) {
                    if (this.deck.length === 0) this.reshuffleDeck();
                    this.hands[this.currentPlayer].push(this.deck.pop());
                }
                this.nextPlayer();
            } else if (card.value === 'S') {
                this.nextPlayer(true); // skip
            } else if (card.value === 'R') {
                this.direction *= -1;
                if (this.hands.filter(h => h.length > 0).length > 2) {
                    this.nextPlayer();
                } else {
                    this.nextPlayer(true); // Bei 2 Spielern wie Skip
                }
            } else {
                if (hand.length === 0) {
                    this.winner = this.currentPlayer;
                    return;
                }
                if (this.hasDrawn) {
                    this.hasDrawn = false;
                    this.nextPlayer();
                } else {
                    this.nextPlayer();
                }
            }
            if (hand.length === 0) {
                this.winner = this.currentPlayer;
            }
        },
        reshuffleDeck() {
            const last = this.discardPile.pop();
            this.deck = this.shuffle(this.discardPile);
            this.discardPile = [last];
        },
        drawCard() {
            if (this.winner !== null) return;
            if (!this.canDraw) return;
            if (this.hasDrawn) return; // Nur 1x ziehen pro Zug
            if (this.deck.length === 0) {
                this.reshuffleDeck();
            }
            this.hands[this.currentPlayer].push(this.deck.pop());
            this.canDraw = false;
            this.hasDrawn = true;
            this.errorMsg = '';
            setTimeout(() => { this.canDraw = true; }, 500);
        },
        nextPlayer(skip = false) {
            this.hasDrawn = false;
            this.errorMsg = '';
            if (skip) {
                this.currentPlayer = (this.currentPlayer + this.direction * 2 + 4) % 4;
            } else {
                this.currentPlayer = (this.currentPlayer + this.direction + 4) % 4;
            }
            this.playerPerspective = this.currentPlayer;
            this.showNextPlayerMsg = true;
            setTimeout(() => { this.showNextPlayerMsg = false; }, 1200);
        },
        passen() {
            // Spieler kann passen, wenn er nach Ziehen nicht legen kann/will
            if (this.hasDrawn) {
                this.hasDrawn = false;
                this.nextPlayer();
            }
        },
        // Hilfsmethode: Prüft, ob eine Karte gelegt werden darf (UNO-Regel +4)
        canPlayCard(card) {
            const top = this.discardPile[this.discardPile.length - 1];
            const topColor = this.currentColor || top.color;
            if (card.color === 'wild') {
                if (card.value === '+4') {
                    // +4 darf nur gelegt werden, wenn keine andere Karte der aktuellen Farbe vorhanden ist
                    const hand = this.hands[this.currentPlayer];
                    return !hand.some(c => c.color === topColor && c.color !== 'wild');
                }
                return true;
            }
            return card.color === topColor || card.value === top.value;
        },
        confirmNewGame() {
            if (confirm('Bist du sicher, dass du ein neues Spiel starten möchtest?')) {
                this.startGame();
            }
        },
        getPlayerIndex(offset) {
            // Zeigt die Spieler so an, dass der aktuelle Spieler immer unten ist
            return (this.currentPlayer + offset) % 4;
        },
    },
    mounted() {
        this.startGame();
    }
}).mount('#app');

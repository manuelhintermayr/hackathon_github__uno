const { createApp } = Vue;
createApp({
    data() {
        return {
            deck: [],
            discardPile: [],
            hands: [[], []],
            currentPlayer: 0,
            winner: null,
            canDraw: true,
            errorMsg: '',
            hasDrawn: false,
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
            this.hands = [[], []];
            this.discardPile = [];
            this.currentPlayer = 0;
            this.winner = null;
            this.canDraw = true;
            this.errorMsg = '';
            this.hasDrawn = false;
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 7; j++) {
                    this.hands[i].push(this.deck.pop());
                }
            }
            // Erste Karte auf Ablagestapel
            this.discardPile.push(this.deck.pop());
        },
        playCard(idx) {
            if (this.winner !== null) return;
            this.errorMsg = '';
            const hand = this.hands[this.currentPlayer];
            const card = hand[idx];
            const top = this.discardPile[this.discardPile.length - 1];
            // Legeregeln für Wild-Karten
            const isPlayable = (
                card.color === top.color ||
                card.value === top.value ||
                card.color === 'wild'
            );
            if (isPlayable) {
                this.discardPile.push(card);
                hand.splice(idx, 1);
                // Wild-Karten: Farbe wählen (hier: zufällig, UI-Auswahl kann später ergänzt werden)
                if (card.color === 'wild' && card.value === 'W') {
                    const colors = ['red', 'green', 'blue', 'yellow'];
                    const chosen = colors[Math.floor(Math.random() * 4)];
                    this.discardPile[this.discardPile.length - 1].color = chosen;
                }
                if (card.color === 'wild' && card.value === '+4') {
                    const colors = ['red', 'green', 'blue', 'yellow'];
                    const chosen = colors[Math.floor(Math.random() * 4)];
                    this.discardPile[this.discardPile.length - 1].color = chosen;
                    // Nächster Spieler zieht 4 Karten und setzt aus
                    this.nextPlayer();
                    for (let i = 0; i < 4; i++) {
                        if (this.deck.length === 0) this.reshuffleDeck();
                        this.hands[this.currentPlayer].push(this.deck.pop());
                    }
                    this.nextPlayer();
                } else if (card.value === '+2') {
                    // Nächster Spieler zieht 2 Karten und setzt aus
                    this.nextPlayer();
                    for (let i = 0; i < 2; i++) {
                        if (this.deck.length === 0) this.reshuffleDeck();
                        this.hands[this.currentPlayer].push(this.deck.pop());
                    }
                    this.nextPlayer();
                } else if (card.value === 'S' || card.value === 'R') {
                    // Bei 2 Spielern: Skip und Reverse wirken wie Skip
                    this.nextPlayer();
                    this.nextPlayer();
                } else {
                    if (hand.length === 0) {
                        this.winner = this.currentPlayer;
                        return;
                    }
                    // Nach Ziehen: Wenn Karte gelegt wird, Zugwechsel
                    if (this.hasDrawn) {
                        this.hasDrawn = false;
                        this.nextPlayer();
                    } else {
                        this.nextPlayer();
                    }
                }
                if (hand.length === 0) {
                    this.winner = this.currentPlayer;
                    return;
                }
            } else {
                this.errorMsg = 'Diese Karte kann nicht gelegt werden!';
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
        nextPlayer() {
            this.hasDrawn = false;
            this.errorMsg = '';
            this.currentPlayer = 1 - this.currentPlayer;
        },
        passen() {
            // Spieler kann passen, wenn er nach Ziehen nicht legen kann/will
            if (this.hasDrawn) {
                this.hasDrawn = false;
                this.nextPlayer();
            }
        }
    },
    mounted() {
        this.startGame();
    }
}).mount('#app');

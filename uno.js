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
            showColorPicker: false,
            pendingWild: null, // { idx, type: 'W' | '+4' }
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
            const isPlayable = (
                card.color === top.color ||
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
            if (card.value === '+2') {
                this.nextPlayer();
                for (let i = 0; i < 2; i++) {
                    if (this.deck.length === 0) this.reshuffleDeck();
                    this.hands[this.currentPlayer].push(this.deck.pop());
                }
                this.nextPlayer();
            } else if (card.value === 'S' || card.value === 'R') {
                this.nextPlayer();
                this.nextPlayer();
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

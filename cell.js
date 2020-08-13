const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

export default class Cell extends HTMLElement {

	constructor() {
		super();
		this._flagged = false;
		this._knownSafe = false;
		this._knownMine = false;
		this._revealed = false;
		this._gameOver = false;
	}

	connectedCallback() {
		this.render();
	}

	get knownSafe() { return this._knownSafe; }
	set knownSafe(v) { this._knownSafe = v; this.render(); }
	get knownMine() { return this._knownMine; }
	set knownMine(v) { this._knownMine = v; this.render(); }

	get tentativeMine() { return this._tentativeMine; }
	set tentativeMine(v) { this._tentativeMine = v; this.render(); }
	get number() { return this._number; }
	set number(v) { this._number = v; this.render(); }

	get flagged() { return this._flagged; }
	set flagged(v) { this._flagged = v; this.render(); }
	get revealed() { return this._revealed; }
	set revealed(v) { this._revealed = v; this.render(); }

	get gameOver() { return this._gameOver; }
	set gameOver(v) { this._gameOver = v; this.render(); }

	render() {
		if (this.gameOver && !this.revealed && (this.tentativeMine || this.knownMine))
			this.innerHTML = this.flagged ? '💀' : '☠';
		else if (this.flagged)
			this.innerHTML = '⛳';
		else if (!this.revealed)
			this.innerHTML = '⬜';
		else if (this.tentativeMine || this.knownMine)
			this.innerHTML = '💥';
		else
			this.innerHTML = numbers[this.number];
	}
}

window.customElements.define('mines-cell', Cell);

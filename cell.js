const defults = {
	_flagged: false,
	_knownSafe: false,
	_knownMine: false,
	_revealed: false,
	_number: 0
};

export default class Cell extends HTMLElement {
	constructor() {
		super();
		Object.assign(this, defults);
	}
}

for (const p in defults)
	if (p.startsWith('_')) {
		const n = p.substr(1);
		Object.defineProperty(Cell.prototype, n, {
			get: function() { return this[p]; },
			set: function(v) {
				this[p] = v;
				if (v === true) this.classList.add(n);
				else if (v === false) this.classList.remove(n);
				else this.setAttribute(n, v);
			}
		});
	}

window.customElements.define('mines-cell', Cell);

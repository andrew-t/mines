import './cell.js';

export default class Grid extends HTMLElement {

	constructor() {
		super();
		this.width = parseInt(this.getAttribute('width'), 10);
		this.height = parseInt(this.getAttribute('height'), 10);
		this.mineCount = parseInt(this.getAttribute('mines'), 10);
		this.innerHTML = `<table><tbody></tbody></table>`;
		const tbody = this.querySelector('tbody');
		this.cells = [];
		for (let y = 0; y < this.height; ++y) {
			const row = this.cells[y] = [],
				tr = document.createElement('tr');
			tbody.appendChild(tr);
			for (let x = 0; x < this.width; ++x) {
				const td = document.createElement('td');
				const cell = row[x] = document.createElement('mines-cell');
				cell.x = x;
				cell.y = y;
				td.appendChild(cell);
				tr.appendChild(td);
				cell.addEventListener('contextmenu', e => {
					e.preventDefault();
					cell.flagged = !cell.flagged;
				});
				cell.addEventListener('click', e => {
					e.preventDefault();
					if (e.which != 1 || cell.flagged)
						return;
					if (cell.revealed) {
						let n = 0;
						for (const neighbour of this.neighbourCells(x, y))
							if (neighbour.flagged) ++n;
						if (n == cell.number)
							for (const neighbour of this.neighbourCells(x, y))
								if (!neighbour.flagged)
									this.reveal(neighbour);
						else console.log(`Not revealing as number is ${cell.number} but only ${n} flags`, cell);
					} else{
						this.reveal(cell);
					}
				});
			}
		}

		button(this, 'Reveal', () => {
			for (const cell of this.allCells())
				cell.revealed = true;
		})
	}

	connectedCallback() {
		this.arrangeMines();
	}

	cell(x, y) {
		return this.cells[y]?.[x]
			|| { knownSafe: true };
	}

	*neighbours(x, y) {
		for (let dx = -1; dx < 2; ++dx)
			for (let dy = -1; dy < 2; ++dy)
				if (dx || dy) {
					const nx = x + dx, ny = y + dy;
					if (nx < this.width && nx >= 0 && ny < this.height && ny >= 0)
						yield [ nx, ny ];
				}
	}

	*neighbourCells(x, y) {
		for (const [nx, ny] of this.neighbours(x, y))
			yield this.cell(nx, ny);
	}

	*allCells() {
		for (const row of this.cells)
			for (const cell of row)
				yield cell;
	}

	reveal(cell) {
		console.log(`Revealing (${cell?.x}, ${cell?.y})`, cell);
		if (!cell || cell.revealed) return;
		cell.revealed = true;
		// TODO: catch unknown mines:
		if (cell.knownMine || cell.tentativeMine) {
			for (const cell of this.allCells())
				cell.gameOver = true;
		}
		else if (cell.number == 0)
			for (const n of this.neighbourCells(cell.x, cell.y))
				this.reveal(n);
	}

	arrangeMines() {
		// TODO: this needs to be way smarter
		let minesLeft = this.mineCount;
		for (const cell of this.cells)
			if (cell.knownMine) --minesLeft;
		const candidates = [ ...this.allCells() ]
			.filter(c => !c.knownMine && !c.knownSafe);
		shuffle(candidates);
		candidates.forEach((cell, i) => cell.tentativeMine = i < minesLeft);

		for (let x = 0; x < this.width; ++x)
			for (let y = 0; y < this.height; ++y) {
				let n = 0;
				for (const cell of this.neighbourCells(x, y))
					if (cell.knownMine || cell.tentativeMine)
						++n;
				this.cell(x, y).number = n;
			}
	}

}

window.customElements.define('mines-grid', Grid);

function shuffle(arr) {
	for (let i = 0; i < arr.length - 1; ++i) {
		const r = i + 1 + ~~(Math.random() * (arr.length - i - 1));
		[ arr[r], arr[i] ] = [ arr[i], arr[r] ];
	}
}

function button(parent, text, callback) {
	const button = document.createElement('button');
	button.setAttribute('type', button);
	button.addEventListener('click', callback);
	button.appendChild(document.createTextNode(text));
	parent.appendChild(button);
	return button;
}
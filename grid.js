import './cell.js';
import LogicGrid from './logic-grid.js';

export default class Grid extends HTMLElement {

	constructor() {
		super();
		this.width = parseInt(this.getAttribute('width'), 10);
		this.height = parseInt(this.getAttribute('height'), 10);
		this.mineCount = parseInt(this.getAttribute('mines'), 10);

		this.logicGrid = new LogicGrid(this.width, this.height, this.mineCount);

		this.innerHTML = `
			<table><tbody></tbody></table>
			<div><span id="flagged">0</span> mines flagged out of ${this.mineCount}</div>
			<div><span id="revealed">0</span> safe spaces found out of ${this.width * this.height - this.mineCount}</div>
			<div id="gameOverReason"></div>
		`;
		const tbody = this.querySelector('tbody'),
			flaggedSpan = this.querySelector('#flagged');
		this.revealedSpan = this.querySelector('#revealed');

		this.cellements = [];
		for (let y = 0; y < this.height; ++y) {
			const row = this.cellements[y] = [],
				tr = document.createElement('tr');
			tbody.appendChild(tr);
			for (let x = 0; x < this.width; ++x) {
				const td = document.createElement('td');
				const cellement = row[x] = document.createElement('mines-cell');
				cellement.x = x;
				cellement.y = y;
				td.appendChild(cellement);
				tr.appendChild(td);
				cellement.addEventListener('contextmenu', e => {
					e.preventDefault();
					if (cellement.revealed || this.classList.contains('gameOver')) return;
					cellement.flagged = !cellement.flagged;
					let f = 0;
					for (const cell of this.allCells())
						if (cell.flagged) ++f;
					flaggedSpan.innerHTML = f;
				});
				cellement.addEventListener('click', e => {
					e.preventDefault();
					if (e.which != 1 || cellement.flagged || this.classList.contains('gameOver'))
						return;
					if (cellement.revealed) {
						let n = 0;
						for (const neighbour of this.neighbourCells(cellement))
							if (neighbour.flagged) ++n;
						const cell = this.logicGrid.cell(x, y);
						if (n == cell.number)
							for (const neighbour of this.neighbourCells(cellement)) {
								if (!neighbour.flagged)
									this.reveal(neighbour);
							}
						else console.log(`Not revealing as number is ${cell.number} but only ${n} flags`, cell);
					} else
						this.reveal(cellement);
				});
			}
		}
	}

	connectedCallback() {
		this.render();
	}

	cell(x, y) {
		return this.cellements[y]?.[x]
			|| { knownSafe: true };
	}

	// todo: collapse into neighbourCells?
	*neighbours(x, y) {
		for (let dx = -1; dx < 2; ++dx)
			for (let dy = -1; dy < 2; ++dy)
				if (dx || dy) {
					const nx = x + dx, ny = y + dy;
					if (nx < this.width && nx >= 0 && ny < this.height && ny >= 0)
						yield [ nx, ny ];
				}
	}

	*neighbourCells(cell) {
		for (const [nx, ny] of this.neighbours(cell.x, cell.y))
			yield this.cell(nx, ny);
	}

	*allCells() {
		for (const row of this.cellements)
			for (const cell of row)
				yield cell;
	}

	reveal(cell) {
		const logicCell = this.logicGrid.cell(cell.x, cell.y);

		// rig it so the first click is always zero
		if (!this.revealedAny) {
			this.logicGrid.makeSafe(logicCell);
			for (const cell of this.logicGrid.neighbourCells(logicCell))
				this.logicGrid.makeSafe(cell);
			this.revealedAny = true;
		}

		if (!logicCell || logicCell.revealed) return;
		console.log(`Revealing (${cell?.x}, ${cell?.y})`, logicCell, cell);
		this.logicGrid.reveal(logicCell);
		if (logicCell.knownMine) {
			this.classList.add('gameOver');
			this.querySelector('#gameOverReason').appendChild(
				document.createTextNode(logicCell.reason)
			);
			const mines = this.logicGrid.generatePossibleMines();
			for (const cell of this.logicGrid.allCells())
				if (!cell.revealed && mines.cell(cell.x, cell.y).knownMine)
					cell.knownMine = true;
		}
		this.render();
	}

	render() {
		for (const cell of this.allCells()) {
			const logicCell = this.logicGrid.cell(cell.x, cell.y);
			cell.knownMine = logicCell.knownMine;
			cell.knownSafe = logicCell.knownSafe;
			cell.revealed = logicCell.revealed;
			cell.number = logicCell.number;
			let n = 0;
			for (const c of this.logicGrid.allCells())
				if (c.revealed && c.knownSafe)
					++n;
			this.revealedSpan.innerHTML = n;
		}
	}

}

window.customElements.define('mines-grid', Grid);

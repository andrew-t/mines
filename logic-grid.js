export default class LogicGrid {

	constructor(width, height, mineCount) {
		if (!height) {
			this.parent = width;
			this.width = this.parent.width;
			this.height = this.parent.height;
			this.mineCount = this.parent.mineCount;
			this.missingMines = this.parent.missingMines;
			this.missingSafes = this.parent.missingSafes;
			this.done = this.parent.done;
			this.failed = this.parent.failed;
			this.invalid = this.parent.invalid;
			// TODO: better deep clone:
			this.cells = JSON.parse(JSON.stringify(this.parent.cells));
		} else {
			this.width = width;
			this.height = height;
			this.mineCount = mineCount;
			this.missingMines = mineCount;
			this.missingSafes = width * height - mineCount;
			this.cells = [];
			for (let y = 0; y < this.height; ++y) {
				const row = this.cells[y] = [];
				for (let x = 0; x < this.width; ++x)
					row[x] = {
						x, y,
						knownSafe: false,
						knownMine: false,
						revealed: false,
						number: 0
					};
			}
		}
	}
	
	clone() { return new LogicGrid(this); }

	cell(x, y) {
		return this.cells[y]?.[x]
			|| { knownSafe: true, revealed: true };
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
		for (const row of this.cells)
			for (const cell of row)
				yield cell;
	}

	*cellsInPlay() {
		for (const cell of this.allCells()) {
			if (cell.revealed || cell.knownMine || cell.knownSafe)
				continue;
			for (const n of this.neighbourCells(cell))
				if (n.revealed && !n.knownMine) {
					yield cell;
					break;
				}
		}
	}

	toString() {
		return '\n' + this.cells.map(row => row.map(cell => {
			if (cell.knownMine && cell.revealed) return '!';
			if (cell.knownMine) return '*';
			if (cell.revealed) return cell.number;
			if (cell.knownSafe) return '-';
			return '?';
		}).join('')).join('\n') +
		`\n + ${this.missingMines} mines left to find`;
	}

	reveal(cell) {
		if (cell.revealed) return;

		if (!cell.knownMine && !cell.knownSafe) {
			// before we can proceed we need to work out what this cell is/could be
			this.resolveCell(cell);
		}

		if (cell.knownMine) {
			cell.revealed = true;
			this.updateKnowledge({ runHypotheticals: true });
			this.failed = true;
			return;
		}

		if (cell.knownSafe) {
			// we need to work out a number for this cell.
			const mines = this.generatePossibleMines();
			const toDo = [ cell ];
			while (toDo.length) {
				const cell = toDo.pop();
				if (cell.revealed) continue;
				cell.number = mines.cell(cell.x, cell.y).number;
				cell.revealed = true;
				this.updateKnowledge({ runHypotheticals: true });
				if (cell.number == 0)
					for (const n of this.neighbourCells(cell))
						toDo.push(n);
			}
			return;
		}

		throw new Error('Error revealing cell');
	}

	resolveCell(cell) {
		// was there a safe space you could have clicked?
		for (const betterCell of this.allCells())
			if (betterCell.knownSafe && !betterCell.revealed) {
				const assumeMine = this.clone();
				assumeMine.makeMine(assumeMine.cell(cell.x, cell.y));
				assumeMine.updateKnowledge({
					runHypotheticals: true,
					exhaustive: true
				});
				if (!assumeMine.invalid) {
					this.makeMine(cell, `Made a mine because the user clicked it when there was a safe space at ${betterCell.x}, ${betterCell.y}`);
					return;
				}
			}

		const ifMine = this.clone(),
			ifSafe = this.clone();
		ifMine.makeMine(ifMine.cell(cell.x, cell.y));
		ifSafe.makeMine(ifSafe.cell(cell.x, cell.y));
		ifMine.updateKnowledge({ runHypotheticals: true, exhaustive: true });
		ifSafe.updateKnowledge({ runHypotheticals: true, exhaustive: true });
		if (ifMine.invalid && ifSafe.invalid)
			throw new Error('This can’t be a mine or safe.');
		if (ifMine.invalid && !ifSafe.invalid) {
			this.makeSafe(cell, `Resolved to safe after an exhaustive search`);
			return;
		}
		if (!ifMine.invalid && ifSafe.invalid) {
			this.makeMine(cell, `Resolved to a mine after an exhaustive search`);
			return;
		}

		// this means it legit could be either.
		// it should be a mine IF we can find another space that's provably safe
		// and safe if we can't.
		for (const alternative in this.cellsInPlay()) {
			if (cell == alternative) continue;
			const ifMine = this.clone();
			ifMine.makeMine(ifMine.cell(alternative.x, alternative.y));
			ifMine.updateKnowledge({
				runHypotheticals: true,
				exhaustive: true
			});
			if (ifMine.invalid) {
				this.makeMine(cell, `Marked a mine because an exhaustive search found a safe space at ${alternative.x}, ${alternative.y}`);
				return;
			}
		}
		
		// welp, we can't think of an excuse to kill the player
		// so i GUESS they're off the hook.
		this.makeSafe(cell, 'Marked safe because we couldn’t find a reason not to');
	}

	generatePossibleMines() {
		this.updateKnowledge({ runHypotheticals: true });
		const beforeLoop = this.toString();
		let iterations = 10;
		mainLoop:
		while (true) {
			if (!--iterations) {
				// console.error('Infinite loop suspected. Input:', beforeLoop);
				throw new Error('Infinite loop suspected');
			}
			const grid = this.clone();
			let subIters = 40;
			while (!grid.done) {
				if (!--subIters) {
					// console.error('Infinite loop suspected. Input:', beforeLoop, 'current:', grid.toString());
					throw new Error('Infinite loop suspected when guessing');
				}
				grid.guessMine();
				if (grid.invalid){
					// console.log('Looping because invalid')
					continue mainLoop;
				}
			}
			if (grid.check()) {
				grid.updateNumbers();
				return grid;
			}
			// console.log('Looping because check failed')
		}
	}

	check() {
		// console.log('check: \n\n' + this.toString());
		let mines = 0;
		for (const cell of this.allCells())
			if (cell.knownMine) ++mines;
			else if (!cell.knownSafe) {
				// console.log('Invalid — cell is mine and safe', cell);
				return false;
			}
			else if (cell.revealed) {
				let n = 0;
				for (const nc of this.neighbourCells(cell))
					if (nc.knownMine) ++n;
				if (n != cell.number) {
					// console.log(`Invalid — expected ${cell.number} mines but found ${n}`, cell);
					return false;
				}
			}
		if (mines != this.mineCount) {
			// console.log(`Invalid — expected ${this.mineCount} mines but found ${mines}`);
			return false;
		}
		// console.log('Valid grid');
		return true;
	}

	guessMine() {
		let places = [ ...this.cellsInPlay() ];
		if (places.length == 0)
			places = [ ...this.allCells() ]
				.filter(c => !c.knownMine && !c.knownSafe);
		if (places.length) {
			const place = places[~~(Math.random() * places.length)];
			if (Math.random() < 0.5)
				this.makeMine(place, 'Guessed a mine');
			else
				this.makeSafe(place, 'Guessed safe');
		} // else console.log('Guessing but there’s nowhere to go');
		else throw new Error('Guessing but there’s nothing to go');
		this.updateKnowledge({ runHypotheticals: false });
		// console.log('done a guess', this.toString());
	}

	makeMine(cell, reason) {
		// if (!this.parent) console.trace(`Setting a mine`, cell);
		cell.knownMine = true;
		if (reason) cell.reason = reason;
		if (--this.missingMines == 0)
			this.done = true;
	}
	
	makeSafe(cell, reason) {
		// if (!this.parent) console.trace(`Marking safe`, cell);
		cell.knownSafe = true;
		if (reason) cell.reason = reason;
		if (--this.missingSafes == 0)
			this.done = true;
	}
	
	updateNumbers() {
		for (const cell of this.allCells())
			if (!cell.revealed) {
				cell.number = 0;
				for (const neighbour of this.neighbourCells(cell))
					if (neighbour.knownMine)
						++cell.number;
			}
	}

	updateKnowledge({ runHypotheticals, exhaustive }) {
		// sort cells into categories:
		const cellsInPlay = [],
			periphery = [],
			revealed = [],
			known = [];
		for (const cell of this.allCells())
			if (cell.knownMine || cell.knownSafe) {
				if (cell.revealed) revealed.push(cell);
				known.push(cell);
			} else {
				let peripheral = true;
				for (const n of this.neighbourCells(cell))
					if (n.revealed) {
						peripheral = false;
						cellsInPlay.push(cell);
						break;
					}
				if (peripheral) periphery.push(cell);
			}

		let learnedAnything = true,
			iterations = 10;
		// just for debug:
		// const beforeLoop = this.toString();
		mainLoop:
		while (learnedAnything) {
			if (!--iterations) {
				// console.error('Infinite loop suspected. Input:', beforeLoop);
				throw new Error('Inifinite loop suspected');
			}
			learnedAnything = false;
		
			// learn about any obviously safe or mine squares:
			for (const cell of revealed) {
				const knownMines = [], knownSafes = [], unknowns = [],
					neighbours = [ ...this.neighbourCells(cell) ];
				for (const n of neighbours) {
					if (n.knownMine) knownMines.push(n);
					else if (n.knownSafe) knownSafes.push(n);
					else unknowns.push(n);
				}
				const missingMines = cell.number - knownMines.length,
					missingSafes = (neighbours.length - cell.number) - knownSafes.length;
				if (missingMines < 0 || missingSafes < 0) {
					this.invalid = true;
					return;
				}
				// console.log({
				//     unknowns: unknowns.length,
				//     missingSafes,
				//     missingMines,
				//     neighbours: neighbours.length,
				//     number: cell.number,
				//     knownSafes: knownSafes.length,
				//     knownMines: knownMines.length
				// })
				if (unknowns.length > 0) {
					if (missingMines == 0) {
						for (const n of unknowns) {
							this.makeSafe(n, `Marked safe because the ${cell.number} at ${cell.x}, ${cell.y} is done`);
							known.push(n);
						}
						learnedAnything = true;
					}
					if (missingSafes == 0) {
						for (const n of unknowns) {
							this.makeMine(n, `Marked a mine because the ${cell.number} at ${cell.x}, ${cell.y} is full`);
							known.push(n);
						}
						learnedAnything = true;
					}
				}
			}

			if (runHypotheticals && !learnedAnything) {
				for (const cell of cellsInPlay) {
					if (cell.knownSafe || cell.knownMine) continue;
					// console.log('Running hypotheticals', this.toString(), cell);
					const ifMine = this.clone();
					ifMine.makeMine(ifMine.cell(cell.x, cell.y));
					ifMine.updateKnowledge({ runHypotheticals: exhaustive, exhaustive });
					if (ifMine.invalid) {
						// console.log('Impossible mine:', cell,
						//     `\nthis:\n${this.toString()}`,
						//     `\nifMine:\n${ifMine.toString()}`);
						this.makeSafe(cell, `Can't be a mine`);
						known.push(cell);
						learnedAnything = true;
						continue mainLoop;
					}
					const ifSafe = this.clone();
					ifSafe.makeSafe(ifSafe.cell(cell.x, cell.y));
					ifSafe.updateKnowledge({ runHypotheticals: exhaustive, exhaustive });
					if (ifSafe.invalid) {
						// console.log('Impossible safe:', cell,
						//     `\nthis:\n${this.toString()}`,
						//     `\nifSafe:\n${ifSafe.toString()}`);
						this.makeMine(cell, `Can't be safe`);
						known.push(cell);
						learnedAnything = true;
						continue mainLoop;
					}
				}
			}

			if (this.missingSafes == 0 && this.missingMines > 0) {
				for (const cell of this.allCells())
					if (!cell.knownMine && !cell.knownSafe)
						this.makeMine(cell, 'Must be a mine because the board is full');
				this.updateNumbers();
				return;
			}
			if (this.missingSafes > 0 && this.missingMines == 0) {
				for (const cell of this.allCells())
					if (!cell.knownMine && !cell.knownSafe)
						this.makeSafe(cell, 'Must be safe because we found all the mines');
				this.updateNumbers();
				return;
			}
			if (this.missingMines < 0 || this.missingSafes < 0) {
				this.invalid = true;
				return;
			}
		}

		this.updateNumbers();
	}

}

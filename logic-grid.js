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
						number: null
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
			if (cell.revealed) return cell.number === null ? 'N' : cell.number;
			if (cell.knownSafe) return '-';
			return '?';
		}).join('')).join('\n') +
		`\n + ${this.missingMines} mines left to find`;
	}

	reveal(cell) {
		if (cell.revealed) return;

		// console.log('resolvo', cell);
		if (!cell.knownMine && !cell.knownSafe) {
			// before we can proceed we need to work out what this cell is/could be
		// console.log('resolvarina');
			this.resolveCell(cell);
			// console.log('resolvomaton', cell);
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

		console.error('Error revealing cell', cell);
		throw new Error('Error revealing cell');
	}

	resolveCell(cell) {
		// First, try to find a world where this can be a mine.
		// If there isn't one, it's safe.
		const assumeMine = this.clone();
		assumeMine.makeMine(assumeMine.cell(cell.x, cell.y));
		assumeMine.updateKnowledge({ runHypotheticals: true, exhaustive: true });
		if (assumeMine.invalid) {
			this.makeSafe(cell,`Made save after an exhaustive search triggered by a user click`);
			return;
		}

		// First, try to find a world where this can be safe.
		// If there isn't one, it's a mine.
		const assumeSafe = this.clone();
		assumeSafe.makeSafe(assumeSafe.cell(cell.x, cell.y));
		assumeSafe.updateKnowledge({ runHypotheticals: true, exhaustive: true });
		if (assumeSafe.invalid) {
			this.makeMine(cell,`Made a mine after an exhaustive search triggered by a user click`);
			return;
		}

		// was there a safe space you could have clicked?
		for (const betterCell of this.allCells())
			if (betterCell != cell && betterCell.knownSafe && !betterCell.revealed) {
				this.makeMine(cell,
					`Made a mine because the user clicked it when there was a safe space at ${betterCell.x}, ${betterCell.y} (${betterCell.reason})`);
				return;
			}
		
		// can we find one exhaustively?
		let anyDidntUseAllTheMines = false;
		const cellsInPlay = [ ...this.cellsInPlay() ],
			someOtherCell = [ ...this.allCells() ]
				.find(x => !x.revealed && !x.knownMine && !x.knownSafe && !cellsInPlay.includes(x));

		// quick shortcut for things we *obviously* can't do but would take ages to check
		if (cellsInPlay.length < this.missingMines) {
			this.makeSafe(cell, `There aren’t enough cells in play for this not to be safe`);
			return;
		}

		// console.log('Cells in play', this.toString(), cellsInPlay.length);
		for (const betterCell of cellsInPlay) {
			if (cell == betterCell) continue;
			// console.log('lets check', betterCell)
			const assumeMine = this.clone();
			assumeMine.makeMine(assumeMine.cell(betterCell.x, betterCell.y));
			assumeMine.updateKnowledge({
				runHypotheticals: true,
				exhaustive: true
			});
			if (assumeMine.invalid) {
				this.makeMine(cell, `Made a mine because the user clicked it when (after an exhaustive search) there was a safe space at ${betterCell.x}, ${betterCell.y}: ${this.toString()} became ${assumeMine.toString()}`);
				return;
			}
			if (!assumeMine.done || someOtherCell?.knownMine)
				anyDidntUseAllTheMines = true;
			// console.log(assumeMine.toString());
		}
		if (!anyDidntUseAllTheMines && someOtherCell) {
			// console.log('gogogo', someOtherCell)
			if (cellsInPlay.includes(cell))
				this.makeMine(cell, `Made a mine because the not-in-play cells must be safe`);
			else
				this.makeSafe(cell, `Made safe because the not-in-play cells must be safe`);
			return;
		}

		const ifMine = this.clone(),
			ifSafe = this.clone();
		ifMine.makeMine(ifMine.cell(cell.x, cell.y));
		ifSafe.makeSafe(ifSafe.cell(cell.x, cell.y));
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
		if (this.invalid) throw new Error('Grid is invalid because ' + this.invalid);
		// const beforeLoop = this.toString();
		let iterations = 50;
		mainLoop:
		while (true) {
			if (!--iterations) {
				// console.error('Infinite loop suspected. Input:', beforeLoop);
				throw new Error('Infinite loop suspected while looping guesses');
			}
			const grid = this.clone();
			let subIters = 400;
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
		if (cell.knownSafe) throw new Error('Making a safe space a mine');
		if (cell.knownMine) return;
		cell.knownMine = true;
		if (reason) {
			cell.reason = reason;
			// console.log(cell.x, cell.y, reason);
		}
		if (--this.missingMines == 0) {
			for (const cell of this.allCells())
				if (!cell.knownMine && !cell.knownSafe)
					this.makeSafe(cell);
			this.done = true;
		}
	}
	
	makeSafe(cell, reason) {
		// if (!this.parent) console.trace(`Marking safe`, cell);
		if (cell.knownMine) throw new Error('Making a mine safe');
		if (cell.knownSafe) return;
		cell.knownSafe = true;
		if (reason) {
			cell.reason = reason;
			// console.log(cell.x, cell.y, reason);
		}
		if (--this.missingSafes == 0) {
			for (const cell of this.allCells())
				if (!cell.knownMine && !cell.knownSafe)
					this.makeMine(cell);
			this.done = true;
		}
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

	updateKnowledge({ runHypotheticals, exhaustive, depth }) {
		if (!depth) depth = 1;
		if (this.invalid)
			throw new Error('Grid is invalid because ' + this.invalid);
		// console.log('uk depth =', depth);

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
			iterations = 50;
		// just for debug:
		// const beforeLoop = this.toString();
		mainLoop:
		while (learnedAnything) {
			if (!--iterations) {
				// console.error('Infinite loop suspected. Input:', beforeLoop);
				throw new Error('Infinite loop suspected while learning');
			}
			learnedAnything = false;
		
			// learn about any obviously safe or mine squares:
			for (const cell of revealed) {
				if (cell.knownMine) continue;
				const knownMines = [], knownSafes = [], unknowns = [],
					neighbours = [ ...this.neighbourCells(cell) ];
				if (cell.number === null) throw new Error('Revealed cell has no number');
				for (const n of neighbours) {
					if (n.knownMine) knownMines.push(n);
					else if (n.knownSafe) knownSafes.push(n);
					else unknowns.push(n);
				}
				const missingMines = cell.number - knownMines.length,
					missingSafes = (neighbours.length - cell.number) - knownSafes.length;
				if (missingMines < 0 || missingSafes < 0) {
					this.invalid = `Cell ${cell.x}, ${cell.y} has ${missingMines} missing mines and ${missingSafes} missing safe spaces`;
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
							if (n.knownMine || n.knownSafe) throw new Error('what');
							this.makeSafe(n, `Marked safe because the ${cell.number} at ${cell.x}, ${cell.y} is done`);
							known.push(n);
						}
						learnedAnything = true;
					}
					else if (missingSafes == 0) {
						for (const n of unknowns) {
							if (n.knownMine || n.knownSafe) throw new Error('what');
							this.makeMine(n, `Marked a mine because the ${cell.number} at ${cell.x}, ${cell.y} is full`);
							known.push(n);
						}
						learnedAnything = true;
					}
				}
			}

			if (runHypotheticals && !learnedAnything) {
				// console.log('cells in play', cellsInPlay.length);
				for (const cell of cellsInPlay) {
					if (cell.knownSafe || cell.knownMine) continue;
					// console.log('Running hypotheticals', this.toString(), cell);
					const ifMine = this.clone();
					ifMine.makeMine(ifMine.cell(cell.x, cell.y));
					ifMine.updateKnowledge({ runHypotheticals: exhaustive, exhaustive, depth: depth + 1 });
					if (ifMine.invalid) {
						// console.log('Impossible mine:', cell,
						//     `\nthis:\n${this.toString()}`,
						//     `\nifMine:\n${ifMine.toString()}`);
						this.makeSafe(cell, `Can't be a mine because ${this.toString()} becomes ${ifMine.toString()}`);
						known.push(cell);
						learnedAnything = true;
						continue mainLoop;
					}
					if (cell.knownSafe || cell.knownMine) continue;
					const ifSafe = this.clone();
					ifSafe.makeSafe(ifSafe.cell(cell.x, cell.y));
					ifSafe.updateKnowledge({ runHypotheticals: exhaustive, exhaustive, depth: depth + 1 });
					if (ifSafe.invalid) {
						// console.log('Impossible safe:', cell,
						//     `\nthis:\n${this.toString()}`,
						//     `\nifSafe:\n${ifSafe.toString()}`);
						this.makeMine(cell, `Can't be safe because ${this.toString()} becomes ${ifSafe.toString()}`);
						known.push(cell);
						learnedAnything = true;
						continue mainLoop;
					}
					// we don't need to loop if we're doing exhaustive searches
					// because that would just make it check every combination
					// in every order which is just overkill
					if (exhaustive) break;
				}
			}

			if (this.missingSafes == 0 && this.missingMines > 0) {
				for (const cell of this.allCells())
					if (!cell.knownMine && !cell.knownSafe)
						this.makeMine(cell, 'Must be a mine because the board is full');
				return;
			}
			if (this.missingSafes > 0 && this.missingMines == 0) {
				for (const cell of this.allCells())
					if (!cell.knownMine && !cell.knownSafe)
						this.makeSafe(cell, 'Must be safe because we found all the mines');
				return;
			}
			if (this.missingMines < 0 || this.missingSafes < 0) {
				this.invalid = `The grid has ${this.missingMines} missing mines and ${this.missingSafes} missing safe spaces.`;
				return;
			}
		}
	}

}

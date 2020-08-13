export default class LogicGrid {

	constructor(width, height, mineCount) {
        if (!height) {
            this.parent = width;
            this.width = this.parent.width;
            this.height = this.parent.height;
            this.mineCount = this.parent.mineCount;
            this.missingMines = this.parent.missingMines;
            this.missingSafes = this.parent.missingSafes;
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
        return this.cells.map(row => row.map(cell => {
            if (cell.knownMine) return '*';
            if (cell.knownSafe) return cell.number;
            return '?';
        }).join('')).join('\n') +
        `\n + ${this.missingMines} mines left to find`;
    }

    reveal(cell) {
        if (cell.revealed) return;

        // HACK: if we don't know what it is,
        // generate a plausible answer and insist it's that
        if (!cell.knownMine && !cell.knownSafe) {
            const guess = this.generatePossibleMines();
            const guessCell = guess.cell(cell.x, cell.y);
            if (guessCell.knownMine) {
                cell.knownMine = true;
                --this.missingMines;
            } else {
                cell.knownSafe = true;
                --this.missingSafes;
            }
            this.updateKnowledge();
        }

        if (cell.knownMine) {
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
                this.updateKnowledge();
                if (cell.number == 0)
                    for (const n of this.neighbourCells(cell))
                        toDo.push(n);
            }
        }
    }

    generatePossibleMines() {
        mainLoop:
        while (true) {
            const grid = this.clone();
            while (!grid.done) {
                grid.guessMine();
                if (grid.invalid) continue mainLoop;
            }
            if (grid.check()) {
                grid.updateNumbers();
                return grid;
            }
        }
    }

    check() {
        console.log('check: \n\n' + this.toString());
        let mines = 0;
        for (const cell of this.allCells())
            if (cell.knownMine) ++mines;
            else if (!cell.knownSafe) {
                console.log('Invalid — cell is mine and safe', cell);
                return false;
            }
            else if (cell.revealed) {
                let n = 0;
                for (const nc of this.neighbourCells(cell))
                    if (nc.knownMine) ++n;
                if (n != cell.number) {
                    console.log(`Invalid — expected ${cell.number} mines but found ${n}`, cell);
                    return false;
                }
            }
        if (mines != this.mineCount) {
            console.log(`Invalid — expected ${this.mineCount} mines but found ${mines}`);
            return false;
        }
        console.log('Valid grid');
        return true;
    }

    guessMine() {
        let places = [ ...this.cellsInPlay() ];
        if (places.length == 0)
            places = [ ...this.allCells() ]
                .filter(c => !c.knownMine && !c.knownSafe);
        if (places.length) {
            const place = places[~~(Math.random() * places.length)];
            if (Math.random() < 0.5) {
                place.knownMine = true;
                --this.missingMines;
            } else {
                place.knownSafe = true;
                --this.missingSafes;
            }
        }
        this.updateKnowledge();
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

    updateKnowledge() {
        // sort cells into categories:
		const cellsInPlay = [],
			periphery = [],
			revealed = [],
			known = [];
		for (const cell of this.allCells())
			if (cell.known) known.push(cell);
			else if (cell.revealed) revealed.push(cell);
			else {
				let peripheral = true;
				for (const n of this.neighbourCells(cell))
					if (n.revealed) {
						peripheral = false;
						cellsInPlay.push(cell);
						break;
					}
				if (peripheral) periphery.push(cell);
            }

        let learnedAnything = true;
        while (learnedAnything) {
            learnedAnything = false;
        
            // learn about any obviously safe or mine squares:
            for (const cell of revealed) {
                const knownMines = [], knownSafes = [], unknowns = [];
                for (const n of this.neighbourCells(cell)) {
                    if (n.knownMine) knownMines.push(n);
                    else if (n.knownSafe) knownSafes.push(n);
                    else unknowns.push(n);
                }
                const missingMines = cell.number - knownMines.length,
                    missingSafes = (8 - cell.number) - knownSafes.length;
                if (missingMines < 0 || missingSafes < 0) {
                    this.invalid = true;
                    return;
                }
                if (unknowns.length > 0) {
                    if (missingMines == 0) {
                        for (const n of unknowns) {
                            n.knownSafe = true;
                            --this.missingSafes;
                            known.push(n);
                        }
                        learnedAnything = true;
                    }
                    if (missingSafes == 0) {
                        for (const n of unknowns) {
                            n.knownMine = true;
                            --this.missingMines;
                            known.push(n);
                        }
                        learnedAnything = true;
                    }
                }
            }

            if (this.missingSafes == 0 && this.missingMines > 0) {
                for (const cell of this.allCells())
                    if (!cell.knownMine && !cell.knownSafe) {
                        cell.knownMine = true;
                        --this.missingMines;
                    }
                this.done = true;
                this.updateNumbers();
                return;
            }
            if (this.missingSafes > 0 && this.missingMines == 0) {
                for (const cell of this.allCells())
                    if (!cell.knownMine && !cell.knownSafe) {
                        cell.knownSafe = true;
                        --this.missingSafes;
                    }
                this.done = true;
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
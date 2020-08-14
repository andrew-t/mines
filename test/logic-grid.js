import LogicGrid from '../logic-grid.js';
import assert from 'assert';

describe('Logic grid', () => {
	it('should stringify as expected', () => {
		const g = grid(2, `
			???
			?0-
			?*1
		`);
		assert.equal(g.toString(), `
???
?0-
?*1
 + 1 mines left to find`);
	});

	it('should infer safe spaces around a completed cell', () => {
		const g = grid(3, `
			???
			??1
			??*
		`);
		g.updateKnowledge({ runHypotheticals: false });
		expectGrid(g, `
			?--
			?-1
			?-*
		`);
	});

	it('should infer mines spaces around a full cell', () => {
		const g = grid(3, `
			???
			?-2
			?--
		`);
		g.updateKnowledge({ runHypotheticals: false });
		expectGrid(g, `
			?**
			?-2
			?--
		`);
	});

	it('should infer safety if all the mines are used', () => {
		const g = grid(2, `
			???
			?-*
			?-*
		`);
		g.updateKnowledge({ runHypotheticals: false });
		expectGrid(g, `
			---
			--*
			--*
		`);
	});

	it('should infer mines if all the grid is full', () => {
		const g = grid(7, `
			???
			?-*
			?-*
		`);
		g.updateKnowledge({ runHypotheticals: false });
		expectGrid(g, `
			***
			*-*
			*-*
		`);
	});

	it('should infer safety if a mine would break the logic', () => {
		const g = grid(3, `
			????
			????
			?111
		`);
		g.updateKnowledge({ runHypotheticals: true });
		expectGrid(g, `
			????
			?-??
			?111
		`);
	});

	it('should combine steps', () => {
		const g = grid(4, `
			?2??
			????
			?311
		`);
		g.updateKnowledge({ runHypotheticals: false });
		expectGrid(g, `
			?2??
			????
			?311
		`);
		g.updateKnowledge({ runHypotheticals: true });
		expectGrid(g, `
			-2-*
			*-*-
			*311
		`);
	});

	it('should reveal cells', () => {
		// this failed intermittently so if it works 100 times without infinite looping we're good
		for (let i = 0; i < 100; ++i) {
			const g = grid(20, `
				?21112*?10
				???-??-?31
				2*22222**1
				2221*33332
				1*112**11*
				1221122111
				02*2000111
				02*20001*2
				012332112*
				001***1011
			`);
			g.reveal(g.cell(6, 1));
			assert.ok(g.check());
		}
	});

	it('should reveal known safe cells', () => {
		for (let i = 0; i < 100; ++i) {
			const g = grid(3, `
				--2
				-**
				???
			`);
			g.reveal(g.cell(0, 0));
			expectGrid(g, `
				1-2
				-**
				???
			`);
		}
	});

	it('should reveal known mines', () => {
		for (let i = 0; i < 100; ++i) {
			const g = grid(3, `
				--2
				-**
				???
			`);
			g.reveal(g.cell(1, 1));
			expectGrid(g, `
				--2
				-!*
				???
			`);
			assert.ok(g.failed);
		}
	});

	it('should reveal patches of zeroes', () => {
		// this failed intermittently so if it works 100 times without infinite looping we're good
		for (let i = 0; i < 100; ++i) {
			const g = grid(6, `
				---*???
				---*???
				---*???
			`);
			g.reveal(g.cell(0, 0));
			expectGrid(g, `
				002*???
				003*???
				002*???
			`);
		}
	});

	it('should reveal choices as safe when you have no alternative', () => {
		for (let i = 0; i < 100; ++i) {
			const g = grid(1, `
				01?
				01?
			`);
			g.reveal(g.cell(2, 0));
			expectSafe(g, 2, 0);
			expectGrid(g, `
				011
				01*
			`);
		}
	});

	it('should reveal choices as mines when you have an alternative', () => {
		for (let i = 0; i < 100; ++i) {
			const g = grid(1, `
				01?
				-1?
			`);
			g.reveal(g.cell(2, 0));
			expectMine(g, 2, 0);
			expectGrid(g, `
				01!
				-1-
			`);
		}
	});

	it('should reveal choices as safe on the normal second turn', () => {
		// for (let i = 0; i < 5; ++i) {
			const g = grid(4, `
				?????
				???2?
				?????
				?????
			`);
			// console.log(g.toString());
			g.reveal(g.cell(1, 2));
			// console.log(g.toString());
			expectSafe(g, 1, 2);
		// }
	});

	it('should reveal the last few squares', () => {
		const g = grid(20, `
			1*112*2*2*
			2211*33232
			*10124*21*
			11001**321
			0000123*21
			11100012*-
			1*210002--
			12*21102**
			1222*102*4
			1*111101-*
		`);
		g.reveal(g.cell(8, 6));
		expectGrid(g, `
			1*112*2*2*
			2211*33232
			*10124*21*
			11001**321
			0000123*21
			11100012*-
			1*2100023-
			12*21102**
			1222*102*4
			1*111101-*
		`);
	});

	it('should reveal the second square', () => {
		for (let i = 0; i < 10; ++i) {
			const g = grid(20, `
				??-??*????
				??21223???
				??10001???
				??11111???
				??????????
				??????????
				??????????
				??????????
				??????????
				??????????
			`);
			g.reveal(g.cell(2, 0));
			expectSafe(g, 2, 0);
			// console.log(g.toString());
		}
	});
});

function expectMine(grid, x, y) {
	const cell = grid.cell(x, y);
	if (cell.knownSafe) throw new Error(cell.reason || 'Cell marked safe');
	if (!cell.knownMine) throw new Error('Cell still unknown');
}

function expectSafe(grid, x, y) {
	const cell = grid.cell(x, y);
	if (cell.knownMine) throw new Error(cell.reason || 'Cell marked mine');
	if (!cell.knownSafe) throw new Error('Cell still unknown');
}

function expectGrid(grid, str) {
	assert.equal(
		tidyString(grid.toString()),
		tidyString(str)
	);
}

function tidyString(str) {
	return str.split('\n')
		.map(r => r.trim())
		.filter(r => r)
		.filter(r => !/mines left/.test(r))
		.map(r => ' ' + r)
		.join('\n');
}

function grid(n, str) {
	const parts = str.split('\n')
		.map(r => r.trim())
		.filter(r => r);
	const grid = new LogicGrid(parts[0].length, parts.length, n);
	for (let y = 0; y < grid.height; ++y)
		for (let x = 0; x < grid.width; ++x) {
			const c = parts[y][x],
				cell = grid.cell(x, y);
			if (c == '*') grid.makeMine(cell);
			else if (c == '-') grid.makeSafe(cell);
			else if (/^\d$/.test(c)) {
				grid.makeSafe(cell);
				cell.revealed = true;
				cell.number = parseInt(c, 10);
			}
		}
	return grid;
}

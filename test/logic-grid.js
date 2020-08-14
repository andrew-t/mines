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
});

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

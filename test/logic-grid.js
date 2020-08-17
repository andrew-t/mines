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
		g.revealedAny = true;
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
			g.revealedAny = true;
			g.reveal(g.cell(2, 0));
			expectSafe(g, 2, 0);
			// console.log(g.toString());
		}
	});

	// This test was a specific instance that failed,
	// but the grid is invalid so there isn't a right answer.
	// TODO: write a better test for mine-unveiling.
	xit('should unveil mines when you lose', () => {
		for (let i = 0; i < 10; ++i) {
			const g = grid(20, `
				??-101*210
				??-2123*21
				*-2*11*3*1
				1111111211
				0000001221
				0001233**1
				0112***431
				12*3343*10
				??33*11110
				??2*210000
			`);
			g.revealedAny = true;
			g.reveal(g.cell(1, 1));
			expectMine(g, 1, 1);
			// console.log(g.toString());
		}
	});

	it('should reveal the last few squares nicely', () => {
		for (let i = 0; i < 10; ++i) {
			const g = grid(20, `
				??21011100
				??*201*100
				***2122222
				23211*11**
				0000111133
				112221012*
				2*3**213*3
				*3*322*4*3
				12121213*2
				0001*10111
			`);
			g.revealedAny = true;
			g.reveal(g.cell(0, 0));
			expectSafe(g, 0, 0);
			expectUnknown(g, 1, 0);
			expectGrid(g, `
				1?21011100
				-?*201*100
				***2122222
				23211*11**
				0000111133
				112221012*
				2*3**213*3
				*3*322*4*3
				12121213*2
				0001*10111
			`);
		}
	});
	
	it('should handle this grid', () => {
		const g = grid(20, `
			??????????
			???2??????
			?2111?????
			?31012????
			**322?????
			??????????
			??????????
			??????????
			??????????
			??????????
		`);
		g.revealedAny = true;
		g.reveal(g.cell(0, 1));
		// console.log(g.toString());
	});

	it('should handle this example', () => {
		for (let i = 0; i < 10; ++i) {
			const g = grid(30, `
				012*1001111*2??
				01*33322*112???
				0112***21112??2
				11112321001*33*
				1*21100000223*2
				123*2111111*321
				12*44*11*112*10
				??4**2222113331
				??*4322*101**3*
				??*21*21101223*
			`);
			g.revealedAny = true;
			g.reveal(g.cell(1, 8));
			expectSafe(g, 1, 8);
			// There are more inferences a clever human could make here but these are the ones the game makes and they're valid:
			expectGrid(g, `
				012*1001111*2-?
				01*33322*112??-
				0112***21112??2
				11112321001*33*
				1*21100000223*2
				123*2111111*321
				12*44*11*112*10
				-*4**2222113331
				-3*4322*101**3*
				--*21*21101223*
			`);
		}
	});

	it('should handle this example', () => {
		for (const i of [1, 2, 4, 3]) {
			const g = grid(40, `
				001*21111001???
				1112*11*1113???
				*101222122*????
				11112*223*34???
				001*213**3*2???
				0122103*4223???
				01*1002*202*???
				23210022202*4??
				**20002*2012*??
				3*20003*41012??
				2231102**1112??
				2*3*1123211*2??
				2*3111*100112??
				2210011100001??
				*100000000001??
			`);
			console.log(`Testing i = ${i}`)
			const cell = g.cell(11, 2);
			g.makeSafe(cell);
			cell.revealed = true;
			cell.number = i;
			g.updateKnowledge({ runHypotheticals: true });
			expectSafe(g, 11, 2);
			console.log(g.toString())
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

function expectUnknown(grid, x, y) {
	const cell = grid.cell(x, y);
	if (cell.knownMine) throw new Error(cell.reason || 'Cell marked mine');
	if (cell.knownSafe) throw new Error(cell.reason || 'Cell marked safe');
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

document.getElementById('start').addEventListener('click', e => {
	e.preventDefault();
	try {
		const width = parseInt(document.getElementById('width').value, 10),
			height = parseInt(document.getElementById('height').value, 10),
			mines = parseInt(document.getElementById('mines').value, 10);
		if (!width || !height || !mines)
			new Error('Could not parse numbers');
		if (width * height - 9 < mines)
			new Error('Too many mines');
		document.getElementById('grid').innerHTML =
			`<mines-grid
				width="${width}"
				height="${height}"
				mines="${mines}">
			</mines-grid>`;
	} catch(e) {
		alert(e.message);
	}
});
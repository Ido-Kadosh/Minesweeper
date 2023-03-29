'use strict';

/**   The maximum is exclusive and the minimum is inclusive*/
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/** this function gets two positions and returns one which is combination of both.*/
function addPos(pos1, pos2) {
	return { i: pos1.i + pos2.i, j: pos1.j + pos2.j };
}

/** This function receives two objects and makes a shallow comparison on them. */
function compareObjectsShallow(objA, objB) {
	for (var key of Object.keys(objA)) {
		if (objA[item] !== objB[item]) return false;
	}
	return true;
}

function renderCell(location, value) {
	const elCell = document.querySelector(`[data-i="${location.i}"][data-j="${location.j}"]`);
	elCell.innerHTML = value;
}

function getRandomEmptyLocation(board) {
	var emptyIndices = [];
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[0].length; j++) {
			if (!board[i][j]) emptyIndices.push({ i, j });
		}
	}
	return shuffle(emptyIndices)[0];
}

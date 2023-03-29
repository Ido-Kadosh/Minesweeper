'use strict';

const HINT_COUNT = 3;

//board size, number of mines
const DIFFICULTIES = [
	[4, 2],
	[8, 14],
	[12, 32],
];

const NUMBER_IMG = [
	`<img draggable="false" src="img/minesweeper_00.png">`,
	`<img draggable="false" src="img/minesweeper_01.png">`,
	`<img draggable="false" src="img/minesweeper_02.png">`,
	`<img draggable="false" src="img/minesweeper_03.png">`,
	`<img draggable="false" src="img/minesweeper_04.png">`,
	`<img draggable="false" src="img/minesweeper_05.png">`,
	`<img draggable="false" src="img/minesweeper_06.png">`,
	`<img draggable="false" src="img/minesweeper_07.png">`,
	`<img draggable="false" src="img/minesweeper_08.png">`,
];

const FLAG_IMG = `<img draggable="false" src="img/minesweeper_flag.png">`;
const CELL_HIDDEN_IMG = `<img class="closed-cell" draggable="false" src="img/minesweeper_cell.png">`;
const MINE_IMG = {
	mine: `<img draggable="false" src="img/minesweeper_mine.png">`,
	clicked: `<img draggable="false" src="img/minesweeper_mine_clicked.png">`,
};
const SMILEY_IMG = {
	smile: `<img draggable="false" class="smiley-img" src="img/minesweeper_smile.png">`,
	death: `<img draggable="false" class="smiley-img" src="img/minesweeper_death.png">`,
	win: `<img draggable="false" class="smiley-img" src="img/minesweeper_win.png">`,
};

const SMILEY_CLICKED_IMG = {
	smile: `<img draggable="false" src="img/minesweeper_smile_clicked.png">`,
	death: `<img draggable="false" src="img/minesweeper_death_clicked.png">`,
	win: `<img draggable="false" src="img/minesweeper_win_clicked.png">`,
};

const HINT_IMG = {
	hint: `<img class="hint" draggable="false" src="img/minesweeper_hint.png">`,
	clicked: `<img class="hint" draggable="false" src="img/minesweeper_hint_clicked.png">`,
};

var gTimerIntervalId;
var gBoard = [];
var gGame = { mineCount: 14, boardSize: 8 };
var gIsHint = false;

function onInit() {
	gGame.lives = 3;
	gGame.minesCreated = false;
	gGame.shownCount = 0;
	gGame.hints = 3;
	gBoard = createBoard();
	renderHints();
	renderBoard(gBoard);
	renderSmileyButton('smile');
	renderMineCount();
	clearInterval(gTimerIntervalId);
	renderTimer(0);
}

function setDifficulty(difficulty) {
	gGame.boardSize = DIFFICULTIES[difficulty][0];
	gGame.mineCount = DIFFICULTIES[difficulty][1];
	onInit();
}

function createBoard() {
	const board = [];
	for (var i = 0; i < gGame.boardSize; i++) {
		board[i] = [];
		for (var j = 0; j < gGame.boardSize; j++) {
			board[i][j] = { cellState: 'closed', isMine: false };
		}
	}
	return board;
}

function renderBoard(board) {
	var strHTML = '';
	for (var i = 0; i < board.length; i++) {
		strHTML += '<tr>';
		for (var j = 0; j < board[0].length; j++) {
			strHTML += `<td data-i=${i} data-j=${j} onClick="onCellClicked(this, event)" onContextMenu="onCellClicked(this, event)">${CELL_HIDDEN_IMG}</td>`;
		}
		strHTML += '</tr>';
	}
	const elBoard = document.querySelector('.board');
	elBoard.innerHTML = strHTML;
}

function onCellClicked(elCell, ev) {
	if (ev.button === 2) ev.preventDefault(); //prevent context menu before we start function logic
	if (gGame.lives === 0) return;

	const cellPos = elCell.dataset;
	const cell = gBoard[cellPos.i][cellPos.j];

	if (cell.cellState === 'open') {
		console.log('cell is open');
		return;
	}
	// --- from here, cell is either flagged or closed ---

	// right click
	if (ev.button === 2) {
		flagCell(elCell, cell);
		return;
	}
	if (ev.button !== 0) return; //there are other buttons, and we need to check them.

	if (gIsHint) {
		handleHints(elCell);
		return;
	}

	if (cell.cellState === 'flagged') return; //if cell flagged and left clicked, do nothing.

	// --- from here, cell is left clicked and closed ---

	//if this is the first click, we create mines and start a timer
	if (!gGame.minesCreated) {
		startTimer();
		createRandomMines(elCell);
	}

	if (cell.isMine) {
		handleMineClicked(elCell);
		return;
	}
	handleCellOpening(elCell); //if we got here, it means a closed cell was left clicked and is not a mine, so we show it.
	if (isVictory()) {
		handleVictory();
		console.log('win');
	}
}

function handleMineClicked(elCell) {
	const cellPos = elCell.dataset;
	const cell = gBoard[cellPos.i][cellPos.j];
	renderCell(cellPos, MINE_IMG.clicked);
	cell.cellState = 'open';
	gGame.lives--;
	updateMineCount(-1);
	if (isGameOver()) {
		handleGameOver(elCell.dataset);
	}
}

function isGameOver() {
	return gGame.lives === 0;
}

function handleHints(elCell) {
	gIsHint = false;
	const cellPos = elCell.dataset;

	//TODO make this into a foreach on neighbors
	for (var i = +cellPos.i - 1; i <= +cellPos.i + 1; i++) {
		for (var j = +cellPos.i - 1; j < +cellPos.j + 1; j++) {
			console.log(i, j);
		}
	}
}

//TODO add this into one with victory
function handleGameOver(clickedCellPos) {
	showAllMines(clickedCellPos);
	renderSmileyButton('death');
	clearInterval(gTimerIntervalId);
	//todo stop game
}

function isVictory() {
	return gGame.shownCount === gGame.boardSize ** 2 - gGame.mineCount;
}

function handleVictory() {
	showAllMines();
	renderSmileyButton('win');
	clearInterval(gTimerIntervalId);
}

/** This function shows all mines except for the position given to it. if no position is given, it shows all mines. */
function showAllMines(clickedCellPos) {
	for (var i = 0; i < gBoard.length; i++) {
		for (var j = 0; j < gBoard[0].length; j++) {
			if (clickedCellPos && +clickedCellPos.i === i && +clickedCellPos.j === j) continue;
			if (gBoard[i][j].isMine) renderCell({ i, j }, MINE_IMG.mine);
		}
	}
}

/** This function renders the smiley button on top
 * @param state which indicates what smiley to render: smile, death, or win
 */
function renderSmileyButton(state) {
	const elSmileyContainer = document.querySelector('.smiley-container');
	elSmileyContainer.innerHTML = `<button class="smiley-button" onmouseup="onSmileyMouseUp(this)">${SMILEY_IMG[state]}</button>`;
}

function onSmileyMouseDown(elCell) {
	//elCell.innerHTML = SMILEY_CLICKED_IMG.smile;
}

function onSmileyMouseUp(elCell) {
	// elCell.innerHTML = SMILEY_IMG.smile;
	// console.log(elCell.innerHTML);
	onInit();
}

function renderMineCount() {
	const mineCount = gGame.mineCount;
	const elMineCount = document.querySelector('.mine-count');
	elMineCount.innerHTML = mineCount;
}

function updateMineCount(diff) {
	const elMineCount = document.querySelector('.mine-count');
	elMineCount.innerHTML = +elMineCount.innerHTML + diff;
}
function flagCell(elCell, cell) {
	const cellPos = elCell.dataset;
	if (cell.cellState === 'closed') {
		renderCell(cellPos, FLAG_IMG);
		cell.cellState = 'flagged';
		updateMineCount(-1);
	} else {
		renderCell(cellPos, CELL_HIDDEN_IMG);
		cell.cellState = 'closed';
		updateMineCount(1);
	}
}

function countNeighMines(elCell) {
	var mineCount = 0;
	var rowIdx = +elCell.dataset.i;
	var colIdx = +elCell.dataset.j;
	for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
		if (i < 0 || i >= gBoard.length) continue;
		for (var j = colIdx - 1; j <= colIdx + 1; j++) {
			if (i === rowIdx && j === colIdx) continue;
			if (j < 0 || j >= gBoard[0].length) continue;
			if (gBoard[i][j].isMine) mineCount++;
		}
	}
	return mineCount;
}

function createRandomMines(elCell) {
	gGame.minesCreated = true;
	const mineLocations = getNRandomMineLocations(gBoard, gGame.mineCount, elCell.dataset);
	for (var i = 0; i < mineLocations.length; i++) {
		const cell = gBoard[mineLocations[i].i][mineLocations[i].j];
		cell.isMine = true;
	}
}

//! THIS FUNCTION NEEDS TO BE WAY MORE READABLE. BUT IT WORKS NOW. LEAVE IT TO LAST.
function handleCellOpening(elCell) {
	if (!elCell) return;

	const cellPos = elCell.dataset;
	const prev = elCell.previousSibling;
	const next = elCell.nextSibling;
	var elRow = elCell.parentNode;
	var prevRow = elRow.previousSibling;
	if (prevRow) prevRow = prevRow.childNodes;
	var nextRow = elRow.nextSibling;
	if (nextRow) nextRow = nextRow.childNodes;

	// const above = prevRow[+cellPos.j];
	// const aboveLeft = prevRow[+cellPos.j - 1];
	// const aboveRight = prevRow[+cellPos.j + 1];
	// const below = nextRow[+cellPos.j];
	// const belowLeft = nextRow[+cellPos.j - 1];
	// const belowRight = nextRow[+cellPos.j + 1];

	const neighCount = countNeighMines(elCell);
	renderCell(elCell.dataset, NUMBER_IMG[neighCount]);
	gGame.shownCount++;
	gBoard[cellPos.i][cellPos.j].cellState = 'open';
	if (neighCount === 0) {
		if (prev && gBoard[prev.dataset.i][prev.dataset.j].cellState === 'closed') handleCellOpening(prev);
		if (next && gBoard[next.dataset.i][next.dataset.j].cellState === 'closed') handleCellOpening(next);
		for (var j = -1; j <= 1; j++) {
			if (prevRow) {
				var element = prevRow[+cellPos.j + j];
				if (element && gBoard[element.dataset.i][element.dataset.j].cellState === 'closed')
					handleCellOpening(element);
			}
			if (nextRow) {
				var element = nextRow[+cellPos.j + j];
				if (element && gBoard[element.dataset.i][element.dataset.j].cellState === 'closed')
					handleCellOpening(element);
			}
		}
	}
}

function getNRandomMineLocations(board, num, skipLocation) {
	const emptyLocations = [];
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[0].length; j++) {
			if (i === +skipLocation.i && j === +skipLocation.j) continue;
			if (!board[i][j].isMine) emptyLocations.push({ i, j });
		}
	}
	return shuffle(emptyLocations).slice(0, num);
}

function startTimer() {
	const start = Date.now();
	gTimerIntervalId = setInterval(() => {
		const now = Date.now();
		renderTimer(Math.floor((now - start) / 1000));
	}, 1000);
}

function renderTimer(time) {
	const elTimer = document.querySelector('.timer');
	elTimer.innerHTML = time;
}

function renderHints() {
	var strHTML = '';
	const elHintContainer = document.querySelector('.hints-container');
	for (var i = 0; i < HINT_COUNT; i++) {
		strHTML += `<button class="hints-button" onclick="onHintClicked(this)">${HINT_IMG.hint}</button></br>`;
	}
	elHintContainer.innerHTML = strHTML;
}

function onHintClicked(elHint) {
	if (elHint.innerHTML === HINT_IMG.hint) {
		if (gIsHint) return;
		elHint.innerHTML = HINT_IMG.clicked;
		gIsHint = true;
	} else {
		elHint.innerHTML = HINT_IMG.hint;
		gIsHint = false;
	}
}

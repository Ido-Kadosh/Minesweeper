'use strict';

const HINT_COUNT = 3;
const HINT_TIMEOUT = 1 * 1000;
const SAFE_CLICK_TIMEOUT = 5 * 1000;
const MEGA_HINT_TIMEOUT = 2 * 1000;
const EXTERMINATE_COUNT = 3;

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

var gDarkMode = localStorage['dark_mode'] === 'true';
var gDifficulty = 1;
var gMegaHintFirstIdx;
var gTimerTime = 0;
var gTimerIntervalId;
var gBoard = [];
var gGame = {};

var gOpenedCells = '';

var gSelfPlacements = [];

function onInit() {
	gOpenedCells = '';
	setDarkMode();

	gGame = {
		safeClickCount: 3,
		isOn: true,
		isHint: false,
		hints: 3,
		isMegaHint: false,
		isMegaUsed: false,
		isExterminateUsed: false,
		isBlinking: false,
		lives: 3,
		minesCreated: false,
		shownCount: 0,
		boardSize: DIFFICULTIES[gDifficulty][0],
		mineCount: DIFFICULTIES[gDifficulty][1],
		isSelfPlace: false,
		flaggedCount: 0,
	};

	renderSafeClickCount();
	gGame.isHint = false;
	gGame.isBlinking = false;
	gBoard = createBoard();
	renderHints(HINT_COUNT);
	renderBoard(gBoard);
	renderSmileyButton('smile');
	renderInitialMineCount();
	clearInterval(gTimerIntervalId);
	renderTimer(0);
	const scores = buildScoreBoard();
	renderScoreBoard(scores);
	renderLives();
}

function onCellClicked(elCell, ev) {
	if (gGame.isSelfPlace) {
		handleSelfPlacement(elCell);
		return;
	}
	if (ev.button === 2) ev.preventDefault(); //prevent context menu before we start function logic
	if (!gGame.isOn) return;

	const cellPos = elCell.dataset;
	const cell = gBoard[cellPos.i][cellPos.j];

	if (cell.cellState === 'open') {
		//console.log('cell is open');
		return;
	}
	// --- from here, cell is either flagged or closed ---

	// right click
	if (ev.button === 2) {
		flagCell(elCell, cell);
		if (isVictory()) {
			handleGameOver();
		}
		return;
	}
	if (ev.button !== 0) return; //there are other mouse buttons, and we need to check them.

	if (!gGame.isHint && cell.cellState === 'flagged') return; //if cell flagged and left clicked, do nothing.

	// --- from here, cell is left clicked and closed ---

	removeAllBlinkers(); //we only want to remove blinkers if a cell is opened, or a hint is pressed. if a flag is placed or pressed, or if we press an open cell, we dont remove blinkers.

	//if this is the first click, we create mines and start a timer
	if (!gGame.minesCreated) {
		startTimer();
		createRandomMines(elCell); //elCell is sent to make sure cell clicked is NOT a mine.
	}

	if (gGame.isHint) {
		handleHints(elCell);
		return;
	}

	if (gGame.isMegaHint) {
		handleMegaHint(elCell);
		return;
	}

	if (cell.isMine) {
		handleMineClicked(elCell);
		if (isVictory()) {
			handleGameOver();
		}
		return;
	}
	handleCellOpening({ ...cellPos }); //if we got here, it means a closed cell was left clicked and is not a mine, so we show it.
	gOpenedCells += '|'; // seperator to be used later to undo every move.
	if (isVictory()) {
		handleGameOver();
	}
}

function handleMineClicked(elCell) {
	const cellPos = elCell.dataset;
	const cell = gBoard[cellPos.i][cellPos.j];
	renderCell(cellPos, MINE_IMG.clicked);
	cell.cellState = 'open';
	gOpenedCells = gOpenedCells + cellPos.i + cellPos.j + '|';
	gGame.lives--;
	gGame.shownCount++;
	gGame.mineCount--;
	updateMineCount(-1);
	renderLives();
	if (isGameOver()) {
		handleGameOver(elCell.dataset);
	}
}

/** This calls on IJ not on element */

function handleHints(elCell) {
	if (!gGame.isOn) return;
	gGame.hints--;
	gGame.isHint = false;
	gGame.isOn = false;
	forEachNeighbor(
		elCell,
		(cellPos) => {
			var neighCount;
			var cell = gBoard[cellPos.i][cellPos.j];
			const elCell = document.querySelector(`[data-i="${cellPos.i}"][data-j="${cellPos.j}"]`);
			if (cell.isMine) {
				renderCell(cellPos, MINE_IMG.mine);
			} else {
				neighCount = countNeighMines(elCell);
				renderCell(cellPos, NUMBER_IMG[neighCount]);
			}

			setTimeout(() => {
				if (cell.cellState === 'closed') {
					renderCell(cellPos, CELL_HIDDEN_IMG);
				} else if (cell.cellState === 'flagged') {
					renderCell(cellPos, FLAG_IMG);
				}
				gGame.isOn = true;
			}, HINT_TIMEOUT);
		},
		true
	);

	renderHints(gGame.hints);
}

function renderHints(num) {
	var strHTML = '';
	const elHintContainer = document.querySelector('.hints-container');
	for (var i = 0; i < num; i++) {
		strHTML += `<button class="hints-button" onclick="onHintClicked(this)">${HINT_IMG.hint}</button></br>`;
	}
	elHintContainer.innerHTML = strHTML;
}

function handleGameOver(clickedCellPos) {
	gGame.isOn = false;
	clearInterval(gTimerIntervalId);

	//we only send this when defeat, so we can check if it has a value.
	if (clickedCellPos) {
		showAllMines();
		renderSmileyButton('death');
	} else {
		showAllMines();
		renderSmileyButton('win');
		localStorage.setItem(`time${localStorage.length}`, gTimerTime);
	}
}

function renderScoreBoard(scores) {
	var strHTML = '<ol type="1" class="scoreboard">';

	//I have no idea how to overwrite data in the localstorage, so for now, we have much more than 20 best scores, but only show top 20 for convenience.
	for (var i = 0; i < scores.length && i < 20; i++) {
		strHTML += `<li>${scores[i]}seconds</li>`;
	}
	const elScoreBoard = document.querySelector('.score-board');
	elScoreBoard.innerHTML = strHTML;
}

function buildScoreBoard() {
	const scores = [];
	for (var i = 0; i < localStorage.length; i++) {
		const currKey = localStorage.key(i);
		if (!currKey.includes('time')) continue;
		const currTime = localStorage.getItem(currKey);
		scores.push(currTime);
	}
	scores.sort((num1, num2) => num1 - num2); // it looks like localStorage already stores items in order, but this isn't reliable.
	return scores;
}

/** This function shows all mines except for the position given to it. if no position is given, it shows all mines. */
function showAllMines() {
	for (var i = 0; i < gBoard.length; i++) {
		for (var j = 0; j < gBoard[0].length; j++) {
			const cell = gBoard[i][j];
			if (cell.cellState === 'open') continue;
			if (cell.isMine) renderCell({ i, j }, MINE_IMG.mine);
		}
	}
}

/** This function renders the smiley button on top
 * @param state which indicates what smiley to render: smile, death, or win
 */
function renderSmileyButton(state) {
	const elSmileyContainer = document.querySelector('.smiley-container');
	elSmileyContainer.innerHTML = `<button class="smiley-button" onmouseup="onInit()">${SMILEY_IMG[state]}</button>`;
}

function renderInitialMineCount() {
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
		gGame.flaggedCount++;
	} else {
		renderCell(cellPos, CELL_HIDDEN_IMG);
		cell.cellState = 'closed';
		updateMineCount(1);
		gGame.flaggedCount--;
	}
}

function countNeighMines(elCell) {
	var mineCount = 0;
	forEachNeighbor(
		elCell,
		(location) => {
			if (gBoard[location.i][location.j].isMine) mineCount++;
		},
		false
	);
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

function handleCellOpening(cellPos) {
	const cell = gBoard[cellPos.i][cellPos.j];
	const elCell = document.querySelector(`[data-i="${cellPos.i}"][data-j="${cellPos.j}"]`);
	if (cell.cellState === 'open') return;
	const neighCount = countNeighMines(elCell);
	renderCell(elCell.dataset, NUMBER_IMG[neighCount]);
	gGame.shownCount++;
	cell.cellState = 'open';
	gOpenedCells = gOpenedCells + cellPos.i + cellPos.j;
	if (neighCount === 0) {
		forEachNeighbor(elCell, handleCellOpening, false);
	}
}

function getAllEmptyLocations(board, skipLocation) {
	const emptyLocations = [];
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[0].length; j++) {
			if (skipLocation && i === +skipLocation.i && j === +skipLocation.j) continue;
			const currCell = board[i][j];
			if (!currCell.isMine && board[i][j].cellState === 'closed') emptyLocations.push({ i, j });
		}
	}
	return emptyLocations;
}

function getNRandomMineLocations(board, num, skipLocation) {
	const emptyLocations = getAllEmptyLocations(board, skipLocation);
	return shuffle(emptyLocations).slice(0, num);
}

function startTimer() {
	const start = Date.now();
	gTimerIntervalId = setInterval(() => {
		const now = Date.now();
		gTimerTime = Math.floor((now - start) / 1000);
		renderTimer(gTimerTime);
	}, 1000);
}

function renderTimer(time) {
	const elTimer = document.querySelector('.timer');
	elTimer.innerHTML = time;
}

function onHintClicked(elHint) {
	if (elHint.innerHTML === HINT_IMG.hint) {
		if (gGame.isHint) return;
		elHint.innerHTML = HINT_IMG.clicked;
		gGame.isHint = true;
	} else {
		elHint.innerHTML = HINT_IMG.hint;
		gGame.isHint = false;
	}
}

function renderLives() {
	const elLivesContainer = document.querySelector('.lives-container');
	elLivesContainer.innerHTML = `lives: ${gGame.lives}`;
}

function renderSafeClickCount() {
	const elSafeClickCounter = document.querySelector('.safe-click-counter span');
	elSafeClickCounter.innerHTML = `${gGame.safeClickCount}`;
}

function onSafeClick() {
	if (!gGame.safeClickCount || !gGame.minesCreated || gGame.isBlinking) return;

	//get random safe location
	const locations = getAllEmptyLocations(gBoard);
	const randomPos = shuffle(locations)[0];
	gGame.isBlinking = true;
	//render location as safe
	const elCell = document.querySelector(`[data-i="${randomPos.i}"][data-j="${randomPos.j}"]`);
	elCell.classList.add('blink');
	setTimeout(() => {
		elCell.classList.remove('blink');
		gGame.isBlinking = false;
	}, SAFE_CLICK_TIMEOUT);

	gGame.safeClickCount--;
	renderSafeClickCount();
}

function forEachNeighbor(elCell, callBackFunc, applyOnSelf) {
	const cellPos = elCell.dataset;
	for (var i = +cellPos.i - 1; i <= +cellPos.i + 1; i++) {
		if (i < 0 || i >= gBoard.length) continue;
		for (var j = +cellPos.j - 1; j <= +cellPos.j + 1; j++) {
			if (!applyOnSelf && i === +cellPos.i && j === +cellPos.j) continue;
			if (j < 0 || j >= gBoard[0].length) continue;
			callBackFunc({ i, j });
		}
	}
}

function onSelfPlace(elButton) {
	if (gGame.minesCreated) return;
	if (!gGame.isSelfPlace) {
		gGame.isSelfPlace = true;

		elButton.classList.add('button-pressed');
	} else {
		gGame.isSelfPlace = false;
		if (gSelfPlacements.length > 0) {
			gGame.minesCreated = true;
			gGame.mineCount = gSelfPlacements.length;
			renderInitialMineCount();
		}
		elButton.classList.remove('button-pressed');
		hideCells(gSelfPlacements);
	}
}

function onMegaClick(elButton) {
	if (gGame.isHint || gGame.isMegaUsed) return;
	gGame.isMegaHint = !gGame.isMegaHint;
	elButton.classList.toggle('mega-hint-button-pressed');
}

function handleMegaHint(elCell) {
	if (gMegaHintFirstIdx) showMegaHint(gMegaHintFirstIdx, elCell.dataset);
	else gMegaHintFirstIdx = elCell.dataset;
}

function showMegaHint(cellPos1, cellPos2) {
	var lowerI = Math.min(cellPos1.i, cellPos2.i);
	var lowerJ = Math.min(cellPos1.j, cellPos2.j);
	var higherI = Math.max(cellPos1.i, cellPos2.i);
	var higherJ = Math.max(cellPos1.j, cellPos2.j);
	for (var i = lowerI; i <= higherI; i++) {
		for (var j = lowerJ; j <= higherJ; j++) {
			const cell = gBoard[i][j];
			if (cell.cellState === 'open') continue;
			const elCell = document.querySelector(`[data-i="${i}"][data-j="${j}"]`);
			var neighCount;
			if (cell.isMine) {
				renderCell({ i, j }, MINE_IMG.mine);
			} else {
				neighCount = countNeighMines(elCell);
				renderCell({ i, j }, NUMBER_IMG[neighCount]);
			}
			setTimeout(renderCell, MEGA_HINT_TIMEOUT, { i, j }, CELL_HIDDEN_IMG);
		}
	}
	const elMegaButton = document.querySelector('.mega-hint');
	gMegaHintFirstIdx = '';
	onMegaClick(elMegaButton);
	gGame.isMegaUsed = true;
	elMegaButton.classList.add('mine-exterminator-pressed');
	elMegaButton.disabled = true;
	elMegaButton.style.cursor = 'not-allowed';
}

function handleSelfPlacement(elCell) {
	const cellPos = elCell.dataset;
	const cell = gBoard[cellPos.i][cellPos.j];
	if (cell.isMine) {
		cell.isMine = false;

		const cellIdx = gSelfPlacements.findIndex((object) => {
			return object.i === cellPos.i && object.j == cellPos.j;
		});
		gSelfPlacements.splice(cellIdx, 1);

		renderCell(cellPos, CELL_HIDDEN_IMG);
	} else {
		cell.isMine = true;
		gSelfPlacements.push(cellPos);
		renderCell(cellPos, MINE_IMG.clicked);
	}
	//console.log(gSelfPlacements);
}

function hideCells(locations) {
	for (let i = 0; i < locations.length; i++) {
		const placement = locations[i];
		renderCell(placement, CELL_HIDDEN_IMG);
	}
}

function onDarkModeToggle(elButton) {
	const elCircle = elButton.querySelector('.circle');
	elCircle.style.transition = '0.2s';
	gDarkMode = !gDarkMode;
	localStorage['dark_mode'] = gDarkMode;
	setDarkMode();
}

/**This function uses gOpenedCells which is a string containing last opened cells in the syntax 'IJ|',
 * where '|' is a separator used to distinguish moves, when a recursive cellOpening happens.
 */
function undo() {
	if (!gGame.isOn) return;

	//take all moves from gOpenedCells, split it into array, splice it into a single last move, then put all remaining moves back into gOpenedCells
	const playedMoves = gOpenedCells.split('|');
	const lastMove = playedMoves.splice(playedMoves.length - 2, 2)[0]; // we use playedMoves.length - 2 because the last item is always an empty string.
	gOpenedCells = playedMoves.join('|') + '|';

	for (var i = 0; i < lastMove.length; i++) {
		const lastMovePos = { i: lastMove[i], j: lastMove[++i] };
		const lastMoveCell = gBoard[lastMovePos.i][lastMovePos.j];
		if (lastMoveCell.isMine) {
			gGame.lives++;
			gGame.mineCount++;
			updateMineCount(1);
			renderLives();
		}
		gGame.shownCount--;
		lastMoveCell.cellState = 'closed';
		renderCell(lastMovePos, CELL_HIDDEN_IMG);
	}
}

function onMineExterminate(elButton) {
	if (gGame.isExterminateUsed || !gGame.minesCreated) return;
	const allLocations = getAllClosedMineLocations(gBoard);
	const exterminateLocations = shuffle(allLocations).slice(0, EXTERMINATE_COUNT);
	if (exterminateLocations.length <= 0) return;
	for (const location of exterminateLocations) {
		const cell = gBoard[location.i][location.j];
		const elCell = document.querySelector(`[data-i="${location.i}"][data-j="${location.j}"]`);
		cell.isMine = false;
		gGame.mineCount--;
		updateMineCount(-1);
		forEachNeighbor(
			elCell,
			(location) => {
				//we get elCell and cell again for each of the neighbors (this is NOT the same as cell, ellCell from above!)
				const elCell = document.querySelector(`[data-i="${location.i}"][data-j="${location.j}"]`);
				const cell = gBoard[location.i][location.j];
				const neighCount = countNeighMines(elCell);
				if (!cell.isMine && cell.cellState === 'open') renderCell(location, NUMBER_IMG[neighCount]);
			},
			false
		);
	}
	gGame.isExterminateUsed = true;
	elButton.classList.add('mine-exterminator-pressed');
	elButton.disabled = true;
	elButton.style.cursor = 'not-allowed';
}

function getAllClosedMineLocations(board) {
	const locations = [];
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[0].length; j++) {
			const cell = board[i][j];
			if (cell.isMine && cell.cellState === 'closed') {
				locations.push({ i, j });
			}
		}
	}
	return locations;
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

function setDifficulty(difficulty) {
	gDifficulty = difficulty;
	onInit();
}
function isGameOver() {
	return gGame.lives === 0;
}
function isVictory() {
	return gGame.shownCount === gGame.boardSize ** 2 - gGame.mineCount && gGame.flaggedCount === gGame.mineCount;
}
function removeAllBlinkers() {
	const elCells = document.querySelectorAll('td');
	for (var cell of elCells) {
		cell.classList.remove('blink');
	}
	gGame.isBlinking = false;
}

function setDarkMode() {
	const elButton = document.querySelector('.dark-mode-container button');
	const elCircle = elButton.querySelector('.circle');
	elButton.classList.add('light-mode-button');

	if (gDarkMode) {
		//changing to dark mode
		document.body.classList.add('dark-mode');

		//changing button
		elButton.classList.remove('dark-mode-button');
		elButton.classList.add('light-mode-button');
		elCircle.style.left = '-25px';
	} else {
		//changing button
		elButton.classList.remove('light-mode-button');
		elButton.classList.add('dark-mode-button');
		elCircle.style.left = '25px';

		//changing to light mode
		document.body.classList.remove('dark-mode');
	}
}

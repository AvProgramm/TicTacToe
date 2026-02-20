// ===================== STATE =====================
const state = {
  mode: 'pvp',         // 'pvp' | 'bot'
  difficulty: 'easy',  // 'easy' | 'medium' | 'hard'
  board: Array(9).fill(null),
  current: 'X',
  gameOver: false,
  scores: { X: 0, O: 0, D: 0 },
  botThinking: false,
};

// ===================== WIN CONDITIONS =====================
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diags
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: null };
  return null;
}

// ===================== MINIMAX =====================
function minimax(board, isMax, alpha, beta, depth) {
  const res = checkWinner(board);
  if (res) {
    if (res.winner === 'O') return 10 - depth;
    if (res.winner === 'X') return depth - 10;
    return 0;
  }
  const moves = board.map((v, i) => v ? null : i).filter(i => i !== null);
  if (isMax) {
    let best = -Infinity;
    for (const i of moves) {
      board[i] = 'O';
      best = Math.max(best, minimax(board, false, alpha, beta, depth + 1));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of moves) {
      board[i] = 'X';
      best = Math.min(best, minimax(board, true, alpha, beta, depth + 1));
      board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(board, difficulty) {
  const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
  if (!empty.length) return null;

  if (difficulty === 'easy') {
    // 80% random
    if (Math.random() < 0.8) return empty[Math.floor(Math.random() * empty.length)];
  }
  if (difficulty === 'medium') {
    // 50% random
    if (Math.random() < 0.5) return empty[Math.floor(Math.random() * empty.length)];
    // Check win / block
    for (const player of ['O', 'X']) {
      for (const i of empty) {
        board[i] = player;
        if (checkWinner(board)?.winner === player) { board[i] = null; return i; }
        board[i] = null;
      }
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Hard: full minimax
  let best = -Infinity, move = empty[0];
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax(board, false, -Infinity, Infinity, 0);
    board[i] = null;
    if (score > best) { best = score; move = i; }
  }
  return move;
}

// ===================== DOM HELPERS =====================
const $ = id => document.getElementById(id);
const cells = document.querySelectorAll('.cell');

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function updateScoreBoard() {
  $('score-num-x').textContent = state.scores.X;
  $('score-num-o').textContent = state.scores.O;
  $('score-draws').textContent = state.scores.D;
}

function updateTurnIndicator() {
  const ti = $('turn-indicator');
  const tt = $('turn-text');
  if (state.botThinking) {
    ti.classList.add('thinking');
    tt.textContent = 'BOT IS THINKING…';
    return;
  }
  ti.classList.remove('thinking');
  if (state.gameOver) return;
  const name = state.current === 'X'
    ? $('name-x').textContent
    : $('name-o').textContent;
  tt.textContent = `${name}'s TURN`;
}

function updateActiveScore() {
  $('score-x').classList.remove('active-turn');
  $('score-o').classList.remove('active-turn');
  if (!state.gameOver) {
    $(state.current === 'X' ? 'score-x' : 'score-o').classList.add('active-turn');
  }
}

function renderBoard() {
  cells.forEach((cell, i) => {
    cell.textContent = '';
    cell.className = 'cell';
    if (state.board[i]) {
      cell.textContent = state.board[i] === 'X' ? '✕' : '○';
      cell.classList.add('taken', state.board[i].toLowerCase());
    }
  });
}

// Win line coords (center of each cell in a 300x300 viewbox with padding=3, gap=3, cellSize~97)
function getCellCenter(idx) {
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const size = 300;
  const pad = 3;
  const gap = 3;
  const cell = (size - pad * 2 - gap * 2) / 3;
  const x = pad + col * (cell + gap) + cell / 2;
  const y = pad + row * (cell + gap) + cell / 2;
  return { x, y };
}

function drawWinLine(line, winner) {
  const winLineEl = $('win-line');
  const lineEl = $('win-line-el');
  const p1 = getCellCenter(line[0]);
  const p2 = getCellCenter(line[2]);

  winLineEl.classList.remove('draw-x', 'draw-o', 'animate');
  lineEl.setAttribute('x1', p1.x);
  lineEl.setAttribute('y1', p1.y);
  lineEl.setAttribute('x2', p2.x);
  lineEl.setAttribute('y2', p2.y);
  winLineEl.classList.add(winner === 'X' ? 'draw-x' : 'draw-o');
  // Force reflow
  void winLineEl.offsetWidth;
  winLineEl.classList.add('animate');
}

function showResult(result) {
  const banner = $('result-banner');
  const text = $('result-text');
  text.className = 'result-text';

  if (result.winner === 'X') {
    text.textContent = `${$('name-x').textContent} WINS! 🏆`;
    text.classList.add('win-x');
    state.scores.X++;
  } else if (result.winner === 'O') {
    text.textContent = `${$('name-o').textContent} WINS! 🏆`;
    text.classList.add('win-o');
    state.scores.O++;
  } else {
    text.textContent = `IT'S A DRAW!`;
    text.classList.add('draw');
    state.scores.D++;
  }

  updateScoreBoard();
  banner.classList.remove('hidden');

  // Highlight winning cells
  if (result.line) {
    result.line.forEach(i => cells[i].classList.add('winning'));
    drawWinLine(result.line, result.winner);
  }

  updateTurnIndicator();
  updateActiveScore();
}

// ===================== GAME LOGIC =====================
function handleMove(idx) {
  if (state.board[idx] || state.gameOver || state.botThinking) return;

  state.board[idx] = state.current;
  renderBoard();

  const result = checkWinner(state.board);
  if (result) {
    state.gameOver = true;
    setTimeout(() => showResult(result), 200);
    return;
  }

  state.current = state.current === 'X' ? 'O' : 'X';
  updateTurnIndicator();
  updateActiveScore();

  // Bot turn
  if (state.mode === 'bot' && state.current === 'O' && !state.gameOver) {
    triggerBotMove();
  }
}

function triggerBotMove() {
  state.botThinking = true;
  updateTurnIndicator();

  const delay = 400 + Math.random() * 400;
  setTimeout(() => {
    const boardCopy = [...state.board];
    const move = getBotMove(boardCopy, state.difficulty);
    state.botThinking = false;

    if (move !== null && !state.gameOver) {
      state.board[move] = 'O';
      renderBoard();

      const result = checkWinner(state.board);
      if (result) {
        state.gameOver = true;
        setTimeout(() => showResult(result), 200);
        return;
      }
      state.current = 'X';
      updateTurnIndicator();
      updateActiveScore();
    }
  }, delay);
}

function startGame() {
  state.board = Array(9).fill(null);
  state.current = 'X';
  state.gameOver = false;
  state.botThinking = false;

  renderBoard();
  $('result-banner').classList.add('hidden');
  $('win-line').classList.remove('draw-x', 'draw-o', 'animate');
  $('win-line-el').setAttribute('x1', 0);
  $('win-line-el').setAttribute('y1', 0);
  $('win-line-el').setAttribute('x2', 0);
  $('win-line-el').setAttribute('y2', 0);

  // Update labels
  if (state.mode === 'bot') {
    $('name-x').textContent = 'PLAYER';
    $('name-o').textContent = 'BOT';
    $('mode-badge').textContent = `BOT · ${state.difficulty.toUpperCase()}`;
  } else {
    $('name-x').textContent = 'PLAYER 1';
    $('name-o').textContent = 'PLAYER 2';
    $('mode-badge').textContent = 'PVP';
  }

  updateTurnIndicator();
  updateActiveScore();
  showScreen('screen-game');
}

function resetScores() {
  state.scores = { X: 0, O: 0, D: 0 };
  updateScoreBoard();
}

// ===================== EVENTS =====================
cells.forEach(cell => {
  cell.addEventListener('click', () => handleMove(parseInt(cell.dataset.index)));
});

$('btn-pvp').addEventListener('click', () => {
  $('difficulty-panel').classList.add('hidden');
  $('btn-pvp').classList.add('selected');
  $('btn-bot').classList.remove('selected');
  state.mode = 'pvp';
  resetScores();
  startGame();
});

$('btn-bot').addEventListener('click', () => {
  $('btn-bot').classList.add('selected');
  $('btn-pvp').classList.remove('selected');
  $('difficulty-panel').classList.remove('hidden');
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
  });
});

$('btn-start-bot').addEventListener('click', () => {
  state.mode = 'bot';
  resetScores();
  startGame();
});

$('btn-rematch').addEventListener('click', () => startGame());

$('back-btn').addEventListener('click', () => {
  state.botThinking = false;
  $('btn-pvp').classList.remove('selected');
  $('btn-bot').classList.remove('selected');
  $('difficulty-panel').classList.add('hidden');
  showScreen('screen-menu');
});

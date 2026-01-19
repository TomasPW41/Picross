// Prevent ALL right-click menus on the page
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, true);

// Wait for page to load
window.addEventListener('load', () => {

// --- PUZZLE SOLVER (for verification) ---
function solvePicross(rowHints, colHints) {
  const rows = rowHints.length;
  const cols = colHints.length;
  const grid = Array(rows).fill().map(() => Array(cols).fill(-1)); // -1 = unknown
  
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;
  
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    
    // Solve rows
    for (let r = 0; r < rows; r++) {
      const possibilities = generateLinePossibilities(grid[r], rowHints[r]);
      if (possibilities.length === 1) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === -1) {
            grid[r][c] = possibilities[0][c];
            changed = true;
          }
        }
      } else if (possibilities.length > 1) {
        // Find cells that are the same in all possibilities
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === -1) {
            const firstVal = possibilities[0][c];
            if (possibilities.every(p => p[c] === firstVal)) {
              grid[r][c] = firstVal;
              changed = true;
            }
          }
        }
      }
    }
    
    // Solve columns
    for (let c = 0; c < cols; c++) {
      const column = grid.map(row => row[c]);
      const possibilities = generateLinePossibilities(column, colHints[c]);
      if (possibilities.length === 1) {
        for (let r = 0; r < rows; r++) {
          if (grid[r][c] === -1) {
            grid[r][c] = possibilities[0][r];
            changed = true;
          }
        }
      } else if (possibilities.length > 1) {
        for (let r = 0; r < rows; r++) {
          if (grid[r][c] === -1) {
            const firstVal = possibilities[0][r];
            if (possibilities.every(p => p[r] === firstVal)) {
              grid[r][c] = firstVal;
              changed = true;
            }
          }
        }
      }
    }
  }
  
  // Check if fully solved
  const isSolved = grid.every(row => row.every(cell => cell !== -1));
  return isSolved ? grid : null;
}

function generateLinePossibilities(line, hints) {
  const length = line.length;
  const possibilities = [];
  
  function backtrack(pos, hintIdx, current) {
    if (hintIdx === hints.length) {
      // All hints placed, fill rest with 0s
      const result = [...current, ...Array(length - pos).fill(0)];
      if (isCompatible(result, line)) {
        possibilities.push(result);
      }
      return;
    }
    
    const hint = hints[hintIdx];
    const remainingHints = hints.slice(hintIdx + 1);
    const minSpaceNeeded = remainingHints.reduce((a, b) => a + b, 0) + remainingHints.length;
    
    // Try placing the hint at different positions
    for (let start = pos; start <= length - hint - minSpaceNeeded; start++) {
      const newCurrent = [
        ...current,
        ...Array(start - pos).fill(0),
        ...Array(hint).fill(1)
      ];
      
      if (hintIdx < hints.length - 1) {
        newCurrent.push(0); // At least one gap after this hint
        backtrack(start + hint + 1, hintIdx + 1, newCurrent);
      } else {
        backtrack(start + hint, hintIdx + 1, newCurrent);
      }
    }
  }
  
  if (hints.length === 1 && hints[0] === 0) {
    const result = Array(length).fill(0);
    if (isCompatible(result, line)) {
      possibilities.push(result);
    }
  } else {
    backtrack(0, 0, []);
  }
  
  return possibilities;
}

function isCompatible(possibility, line) {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== -1 && line[i] !== possibility[i]) {
      return false;
    }
  }
  return true;
}

// --- PUZZLE GENERATOR ---
function generatePuzzle(rows, cols, fillRate = 0.5) {
  // For large grids, skip verification (too slow)
  if (rows >= 15 || cols >= 15) {
    console.log('⚡ Large grid detected - generating without uniqueness verification');
    const grid = Array(rows).fill().map(() =>
      Array(cols).fill().map(() => Math.random() < fillRate ? 1 : 0)
    );
    return grid;
  }
  
  // For smaller grids, verify unique solution
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random grid
    const grid = Array(rows).fill().map(() =>
      Array(cols).fill().map(() => Math.random() < fillRate ? 1 : 0)
    );
    
    // Generate hints
    const { rowHints, colHints } = generateHints(grid);
    
    // Verify unique solution
    const solved = solvePicross(rowHints, colHints);
    
    if (solved && JSON.stringify(solved) === JSON.stringify(grid)) {
      console.log(`✅ Valid puzzle found on attempt ${attempt + 1}`);
      return grid;
    }
  }
  
  console.warn('⚠️ Could not generate valid puzzle, using fallback');
  // Fallback to a simple valid pattern
  return Array(rows).fill().map((_, r) =>
    Array(cols).fill().map((_, c) => (r + c) % 2)
  );
}

// --- REST OF YOUR CODE ---
let solution;
let rows = 5;
let cols = 5;

// --- Generate Hints ---
function generateHints(grid) {
  const rowsCount = grid.length;
  const colsCount = grid[0].length;
  
  const rowHints = grid.map(row => {
    const hints = [];
    let count = 0;
    row.forEach(cell => {
      if(cell) count++;
      else if(count) { hints.push(count); count = 0; }
    });
    if(count) hints.push(count);
    return hints;
  });

  const colHints = [];
  for(let c=0; c<colsCount; c++){
    const hints = [];
    let count = 0;
    for(let r=0; r<rowsCount; r++){
      if(grid[r][c]) count++;
      else if(count){ hints.push(count); count = 0; }
    }
    if(count) hints.push(count);
    colHints.push(hints);
  }

  return { rowHints, colHints };
}

// --- Game State ---
let mouseDown = false;
let dragButton = 0;
let dragAction = null; // 'fill', 'grey', or 'ungrey'
let startRow = null;
let startCol = null;
let currentRow = null;
let currentCol = null;
let gameOver = false;

const table = document.getElementById('picross-grid');

// --- Timer ---
let timerInterval = null;
let secondsElapsed = 0;
let currentStreak = 0;
let bestStreak = 0;

// --- Leaderboard (stored in localStorage) ---
function getLeaderboard() {
  const saved = localStorage.getItem('picrossLeaderboard');
  return saved ? JSON.parse(saved) : {};
}

function saveLeaderboard(leaderboard) {
  localStorage.setItem('picrossLeaderboard', JSON.stringify(leaderboard));
}

function updateLeaderboard(gridSize, time) {
  const leaderboard = getLeaderboard();
  const key = gridSize;
  
  if (!leaderboard[key] || time < leaderboard[key]) {
    leaderboard[key] = time;
    saveLeaderboard(leaderboard);
    return true; // New record!
  }
  return false;
}

function getPersonalBest(gridSize) {
  const leaderboard = getLeaderboard();
  return leaderboard[gridSize] || null;
}

function startTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  const messageEl = document.getElementById('message');
  messageEl.style.display = 'block';
  messageEl.innerText = `⏱ Time: ${secondsElapsed}s`;
  timerInterval = setInterval(() => {
    if(!gameOver){
      secondsElapsed++;
      messageEl.innerText = `⏱ Time: ${secondsElapsed}s`;
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateStreakDisplay() {
  document.getElementById('streak').innerText = `🔥 Streak: ${currentStreak} | 🏆 Best: ${bestStreak}`;
}

// --- Fill Cell Logic ---
const fillCell = (cell, button, action) => {
  if(gameOver) return;

  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  if(action === 'fill'){
    if(cell.classList.contains('grey')) cell.classList.remove('grey');

    if(solution[r][c] === 1){
      cell.classList.add('filled');
    } else {
      gameOver = true;
      stopTimer();
      cell.classList.add('filled', 'wrong');
      document.getElementById('message').innerText = `💀 Game Over! Wrong cell. Time: ${secondsElapsed}s`;
      
      // Reset streak on loss
      currentStreak = 0;
      updateStreakDisplay();
    }
  } else if(action === 'grey'){
    if(!cell.classList.contains('filled')){
      cell.classList.add('grey');
    }
  } else if(action === 'ungrey'){
    cell.classList.remove('grey');
  }
};

// --- Build Grid ---
function buildGrid(newSolution = null) {
  gameOver = false;
  mouseDown = false;
  dragAction = null;
  startRow = startCol = currentRow = currentCol = null;
  
  const messageEl = document.getElementById('message');
  messageEl.innerHTML = '<span class="spinner">⏳</span> Generating puzzle...';
  messageEl.style.display = 'block';

  // Use setTimeout to allow spinner to render before heavy computation
  setTimeout(() => {
    // Generate new random puzzle if none provided
    if (!newSolution) {
      newSolution = generatePuzzle(rows, cols, 0.5);
    }
    
    solution = newSolution;
    const { rowHints, colHints } = generateHints(solution);

    table.innerHTML = '';

    for(let r=0; r<=rows; r++){
      const tr = document.createElement('tr');
      for(let c=0; c<=cols; c++){
        const td = document.createElement('td');

        if(r===0 && c===0) td.classList.add('hint');
        else if(r===0){ td.classList.add('hint'); td.innerText = colHints[c-1].join('\n'); }
        else if(c===0){ td.classList.add('hint'); td.innerText = rowHints[r-1].join(' '); }
        else {
          td.dataset.row = r-1;
          td.dataset.col = c-1;

          td.addEventListener('mousedown', (e) => {
            if(gameOver) return;
            e.preventDefault();
            mouseDown = true;
            dragButton = e.button;
            startRow = parseInt(td.dataset.row);
            startCol = parseInt(td.dataset.col);
            currentRow = startRow;
            currentCol = startCol;

            // Determine the drag action based on first cell
            if(e.button === 0) {
              dragAction = 'fill';
            } else if(e.button === 2) {
              dragAction = td.classList.contains('grey') ? 'ungrey' : 'grey';
            }

            updateHoverLine();
          });

          td.addEventListener('mouseover', () => {
            currentRow = parseInt(td.dataset.row);
            currentCol = parseInt(td.dataset.col);

            td.classList.add('hover');

            if(mouseDown) updateHoverLine();
          });

          td.addEventListener('mouseout', () => {
            if(!mouseDown) td.classList.remove('hover');
          });

          td.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    messageEl.innerHTML = '';
    messageEl.style.display = 'none';
    startTimer();
  }, 50);
}

// --- Highlight line during drag ---
function updateHoverLine() {
  table.querySelectorAll('td.hover').forEach(h => h.classList.remove('hover'));

  if(startRow === null || startCol === null || currentRow === null || currentCol === null) return;

  if(startRow === currentRow){
    const r = startRow;
    const cStart = Math.min(startCol, currentCol);
    const cEnd = Math.max(startCol, currentCol);
    for(let c=cStart; c<=cEnd; c++){
      table.rows[r+1].cells[c+1].classList.add('hover');
    }
  } else if(startCol === currentCol){
    const c = startCol;
    const rStart = Math.min(startRow, currentRow);
    const rEnd = Math.max(startRow, currentRow);
    for(let r=rStart; r<=rEnd; r++){
      table.rows[r+1].cells[c+1].classList.add('hover');
    }
  }
}

// --- Mouseup: Fill Line ---
document.addEventListener('mouseup', () => {
  if(gameOver) return;

  if(mouseDown && startRow !== null && startCol !== null){
    const endRow = (currentRow !== null) ? currentRow : startRow;
    const endCol = (currentCol !== null) ? currentCol : startCol;

    if(startRow === endRow){
      const r = startRow;
      const cStart = Math.min(startCol, endCol);
      const cEnd = Math.max(startCol, endCol);
      for(let c=cStart; c<=cEnd; c++){
        const cell = table.rows[r+1].cells[c+1];
        fillCell(cell, dragButton, dragAction);
      }
    } else if(startCol === endCol){
      const c = startCol;
      const rStart = Math.min(startRow, endRow);
      const rEnd = Math.max(startRow, endRow);
      for(let r=rStart; r<=rEnd; r++){
        const cell = table.rows[r+1].cells[c+1];
        fillCell(cell, dragButton, dragAction);
      }
    }

    table.querySelectorAll('td.hover').forEach(h => h.classList.remove('hover'));

    if(!gameOver) checkWin();
  }

  mouseDown = false;
  dragAction = null;
  startRow = startCol = currentRow = currentCol = null;
});

// --- Check Win ---
function checkWin() {
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const cell = table.rows[r+1].cells[c+1];
      if(solution[r][c] === 1 && !cell.classList.contains('filled')) return;
    }
  }

  gameOver = true;
  stopTimer();
  
  // Increment streak on win
  currentStreak++;
  if(currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }
  updateStreakDisplay();
  
  // Check for personal best
  const gridSize = `${rows}x${cols}`;
  const isNewRecord = updateLeaderboard(gridSize, secondsElapsed);
  
  let message = `🎉 You solved it! Time: ${secondsElapsed}s`;
  if (isNewRecord) {
    message += ' 🏆 NEW RECORD!';
  } else {
    const pb = getPersonalBest(gridSize);
    message += ` (PB: ${pb}s)`;
  }
  
  document.getElementById('message').innerText = message;

  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const cell = table.rows[r+1].cells[c+1];
      if(solution[r][c] === 1){
        cell.classList.add('rainbow');
      }
    }
  }
}

// --- Reset Button ---
document.getElementById('reset-btn').addEventListener('click', () => {
  buildGrid();
});

document.getElementById('dark-mode-btn').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// --- Help/Instructions Modal ---
document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').style.display = 'flex';
});

document.getElementById('close-help').addEventListener('click', () => {
  document.getElementById('help-modal').style.display = 'none';
});

// Close modal when clicking outside
document.getElementById('help-modal').addEventListener('click', (e) => {
  if(e.target.id === 'help-modal') {
    document.getElementById('help-modal').style.display = 'none';
  }
});

// --- Leaderboard Modal ---
document.getElementById('leaderboard-btn').addEventListener('click', () => {
  const modal = document.getElementById('leaderboard-modal');
  if(modal.style.display === 'flex') {
    modal.style.display = 'none';
  } else {
    showLeaderboard();
  }
});

document.getElementById('close-leaderboard').addEventListener('click', () => {
  document.getElementById('leaderboard-modal').style.display = 'none';
});

document.getElementById('leaderboard-modal').addEventListener('click', (e) => {
  if(e.target.id === 'leaderboard-modal') {
    document.getElementById('leaderboard-modal').style.display = 'none';
  }
});

function showLeaderboard() {
  const leaderboard = getLeaderboard();
  const sizes = ['5x5', '5x10', '10x10', '10x15', '15x15', '15x20', '20x20', '20x25', '25x25'];
  
  let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
  html += '<tr style="border-bottom: 2px solid #333;"><th style="padding: 10px; text-align: left;">Grid Size</th><th style="padding: 10px; text-align: right;">Best Time</th></tr>';
  
  sizes.forEach(size => {
    const time = leaderboard[size];
    html += `<tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">${size}</td>
      <td style="padding: 10px; text-align: right;">${time ? time + 's' : '-'}</td>
    </tr>`;
  });
  
  html += '</table>';
  
  document.getElementById('leaderboard-content-data').innerHTML = html;
  document.getElementById('leaderboard-modal').style.display = 'flex';
}

// --- Grid Size Selector ---
document.getElementById('grid-size').addEventListener('change', (e) => {
  const [r, c] = e.target.value.split('x').map(Number);
  rows = r;
  cols = c;
  buildGrid();
});

buildGrid();
updateStreakDisplay();

}); // End of window load event

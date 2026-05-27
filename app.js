/**
 * 游戏UI渲染
 */

/* global PATTERNS */  // PATTERNS 在 main.js 中定义

// 将数字索引转换为 emoji
function getPatternEmoji(idx) {
  if (typeof PATTERNS !== 'undefined' && PATTERNS[idx]) {
    return PATTERNS[idx];
  }
  return '?';
}

function initApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }

  // 创建游戏实例
  const game = new LinkGame({
    rows: 10,  // 10行（纵向更长）
    cols: 8,   // 8列
    timeLimit: 180,
    hints: 3
  });

  // 渲染初始界面
  renderGame(app, game);
  
  // 启动游戏
  game.init(1);
}

/**
 * 渲染游戏界面
 */
function renderGame(container, game) {
  // 创建主容器
  container.innerHTML = `
    <div class="game-container">
      <!-- 游戏头部 -->
      <div class="header-wrapper">
        <div class="header">
          <div class="header-content">
            <!-- 游戏信息 -->
            <div class="game-info">
              <div class="info-item">
                <div class="info-label">关卡</div>
                <div id="level" class="info-value level-value">1</div>
              </div>
              <div class="info-item">
                <div class="info-label">得分</div>
                <div id="score" class="info-value score-value">0</div>
              </div>
              <div class="info-item">
                <div class="info-label">时间</div>
                <div id="time" class="info-value time-value">180</div>
              </div>
            </div>
            
            <!-- 进度条 -->
            <div class="progress-wrapper">
              <div class="info-label">进度</div>
              <div class="progress-bg">
                <div id="progress" class="progress-bar"></div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="btn-group">
              <button id="hint-btn" class="btn btn-primary">
                💡 提示 <span id="hints" class="hint-count">3</span>
              </button>
              <button id="shuffle-btn" class="btn btn-warning">
                🔀 重排
              </button>
              <button id="restart-btn" class="btn btn-secondary">
                🔄 重开
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 游戏棋盘 -->
      <div class="board-wrapper">
        <div id="board" class="board"></div>
        <svg id="path-svg" class="path-svg"></svg>
      </div>
      
      <!-- 游戏结束弹窗 -->
      <div id="modal" class="modal">
        <div class="modal-content">
          <div id="modal-icon" class="modal-icon">🎉</div>
          <h2 id="modal-title" class="modal-title">恭喜过关!</h2>
          <p id="modal-desc" class="modal-desc">你的得分: <span id="modal-score">0</span></p>
          <div class="modal-btns">
            <button id="modal-next" class="btn btn-primary">下一关</button>
            <button id="modal-restart" class="btn btn-secondary">重新开始</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 获取 DOM 元素
  const boardEl = document.getElementById('board');
  const levelEl = document.getElementById('level');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const progressEl = document.getElementById('progress');
  const hintsEl = document.getElementById('hints');
  const pathSvg = document.getElementById('path-svg');
  const modal = document.getElementById('modal');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalScore = document.getElementById('modal-score');
  const modalNext = document.getElementById('modal-next');
  const modalRestart = document.getElementById('modal-restart');
  const hintBtn = document.getElementById('hint-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const restartBtn = document.getElementById('restart-btn');

  // 格子大小 - 根据屏幕宽度动态计算
  function calculateCellSize() {
    const screenWidth = window.innerWidth;
    const cols = game.config.cols;
    const rows = game.config.rows;
    
    // 获取 board-wrapper 的实际宽度（减去 padding）
    const boardWrapper = document.querySelector('.board-wrapper');
    const wrapperPadding = 5; // board-wrapper 的 padding
    const availableWidth = boardWrapper ? boardWrapper.clientWidth - wrapperPadding * 2 : screenWidth - 32;
    
    // 计算可用高度（屏幕高度减去头部和其他元素）
    const headerHeight = 120; // 头部大约高度
    const availableHeight = window.innerHeight - headerHeight - 32; // 减去其他边距
    
    // 根据宽度计算格子大小
    const cellSizeByWidth = Math.floor((availableWidth - (cols - 1) * 2) / cols);
    
    // 根据高度计算格子大小
    const cellSizeByHeight = Math.floor((availableHeight - (rows - 1) * 2) / rows);
    
    // 取较小值，确保棋盘在宽度和高度上都能适应
    let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
    
    // 移动端：根据屏幕宽度计算
    if (screenWidth <= 768) {
      // 最大不超过65px，最小不低于28px
      cellSize = Math.max(28, Math.min(cellSize, 65));
    } else {
      // 桌面端：最大不超过75px
      cellSize = Math.max(35, Math.min(cellSize, 75));
    }
    
    return cellSize;
  }
  
  let cellSize = calculateCellSize();
  const gap = 2; // 与 CSS 中的 gap 保持一致
  
  // 窗口大小变化时重新计算
  window.addEventListener('resize', () => {
    cellSize = calculateCellSize();
    const state = game.getState();
    if (state.board.length) {
      renderBoard(state);
    }
  });

  /**
   * 渲染棋盘
   */
  function renderBoard(state) {
    const { board, selected } = state;
    
    if (!board.length || !board[0]?.length) return;
    
    const rows = board.length;
    const cols = board[0].length;
    const boardWrapper = document.querySelector('.board-wrapper');
    
    // 设置棋盘网格
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    
    // 设置 SVG 大小和位置
    const boardWidth = cols * cellSize + (cols - 1) * gap;
    const boardHeight = rows * cellSize + (rows - 1) * gap;
    pathSvg.setAttribute('width', String(boardWidth));
    pathSvg.setAttribute('height', String(boardHeight));
    pathSvg.style.width = `${boardWidth}px`;
    pathSvg.style.height = `${boardHeight}px`;
    
    // 计算棋盘在 board-wrapper 中的实际位置（考虑居中）
    if (boardWrapper) {
      const wrapperWidth = boardWrapper.clientWidth - 10; // 减去 padding
      const wrapperHeight = boardWrapper.clientHeight - 10;
      const offsetX = (wrapperWidth - boardWidth) / 2;
      const offsetY = (wrapperHeight - boardHeight) / 2;
      pathSvg.style.left = `${5 + offsetX}px`;
      pathSvg.style.top = `${5 + offsetY}px`;
    }
    
    boardEl.innerHTML = '';
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        const pattern = board[r][c];
        const isSelected = selected && selected.row === r && selected.col === c;
        
        // 使用 pattern !== null 而不是 pattern，因为 0 也是有效的图案索引
        const hasPattern = pattern !== null && pattern !== undefined;
        cell.className = 'cell' + (hasPattern ? ' cell-active' : '') + (isSelected ? ' cell-selected' : '');
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.style.fontSize = `${cellSize * 0.55}px`;
        
        if (hasPattern) {
          cell.textContent = getPatternEmoji(pattern);  // 将数字索引转换为 emoji 显示
          cell.dataset.row = String(r);
          cell.dataset.col = String(c);
          
          // 移动端使用 touchend，桌面端使用 click，避免同时触发
          const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          
          let isProcessing = false;
          
          const handleInteraction = (e) => {
            // 防止默认行为和冒泡
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            
            // 防止快速重复触发
            if (isProcessing || game.state.showingPath) return;
            isProcessing = true;
            
            game.click(r, c);
            
            // 短暂延迟后重置状态
            setTimeout(() => {
              isProcessing = false;
            }, 300);  // 增加到300ms，确保路径显示完成
          };
          
          // 根据设备类型添加对应的事件监听器
          if (isMobile) {
            // 移动端：只使用 touchend，阻止 click 事件
            cell.addEventListener('touchend', handleInteraction, { passive: false });
          } else {
            // 桌面端：只使用 click
            cell.addEventListener('click', handleInteraction);
          }
        }
        
        boardEl.appendChild(cell);
      }
    }
  }

  /**
   * 更新 UI
   */
  function updateUI(state) {
    levelEl.textContent = String(state.level);
    scoreEl.textContent = String(state.score);
    timeEl.textContent = String(state.time);
    hintsEl.textContent = String(state.hints);
    
    // 更新进度
    const progress = state.totalPairs > 0 
      ? (state.matchedPairs / state.totalPairs) * 100 
      : 0;
    progressEl.style.width = `${progress}%`;
    
    // 时间警告
    if (state.time <= 30) {
      timeEl.classList.add('time-warning');
    } else {
      timeEl.classList.remove('time-warning');
    }
    
    // 渲染棋盘
    renderBoard(state);
    
    // 检查游戏结束
    if (!state.isPlaying) {
      showGameOver(state);
    }
  }

  /**
   * 绘制连线
   */
  function drawPath(path) {
    pathSvg.innerHTML = '';
    
    if (path.length < 2) return;
    
    // 转换坐标（每个格子的中心点）
    const points = path.map(p => ({
      x: p.col * (cellSize + gap) + cellSize / 2,
      y: p.row * (cellSize + gap) + cellSize / 2
    }));
    
    // 创建路径
    const pathD = points.reduce((d, p, i) => {
      return d + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, '');
    
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', '#764ba2');
    pathEl.setAttribute('stroke-width', '4');
    pathEl.setAttribute('stroke-linecap', 'round');
    pathEl.setAttribute('stroke-linejoin', 'round');
    pathEl.setAttribute('stroke-opacity', '0.8');
    
    pathSvg.appendChild(pathEl);
    
    // 清除路径
    setTimeout(() => {
      pathSvg.innerHTML = '';
    }, 500);
  }

  /**
   * 显示提示
   */
  function showHint(hint) {
    if (!hint) return;
    
    const cells = boardEl.querySelectorAll('[data-row]');
    cells.forEach(cell => {
      const row = parseInt(cell.getAttribute('data-row'));
      const col = parseInt(cell.getAttribute('data-col'));
      
      if ((row === hint.row1 && col === hint.col1) || 
          (row === hint.row2 && col === hint.col2)) {
        cell.classList.add('cell-hint');
        setTimeout(() => {
          cell.classList.remove('cell-hint');
        }, 1500);
      }
    });
  }

  /**
   * 显示游戏结束弹窗
   */
  function showGameOver(state) {
    modal.classList.add('modal-show');
    
    if (state.isWin) {
      modalIcon.textContent = '🎉';
      modalTitle.textContent = '恭喜过关!';
      modalDesc.innerHTML = `你的得分: <span style="font-weight: bold; color: #22c55e;">${state.score}</span>`;
      modalNext.style.display = 'inline-block';
    } else {
      modalIcon.textContent = '😢';
      modalTitle.textContent = '时间到!';
      modalDesc.innerHTML = `最终得分: <span style="font-weight: bold; color: #3b82f6;">${state.score}</span>`;
      modalNext.style.display = 'none';
    }
    
    modalScore.textContent = String(state.score);
  }

  /**
   * 隐藏弹窗
   */
  function hideModal() {
    modal.classList.remove('modal-show');
  }

  // 注册事件监听
  game.onState(updateUI);
  game.onPath(drawPath);

  // 辅助函数：根据设备类型添加事件监听器
  function addTouchClick(btn, handler) {
    let isProcessing = false;
    const handle = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isProcessing) return;
      isProcessing = true;
      handler();
      setTimeout(() => { isProcessing = false; }, 300);
    };
    
    // 根据设备类型选择事件
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      btn.addEventListener('touchend', handle, { passive: false });
    } else {
      btn.addEventListener('click', handle);
    }
  }

  // 提示按钮
  addTouchClick(hintBtn, () => {
    const hint = game.useHint();
    showHint(hint);
  });

  // 重排按钮
  addTouchClick(shuffleBtn, () => {
    game.reshuffle();
  });

  // 重开按钮
  addTouchClick(restartBtn, () => {
    hideModal();
    game.init(1);
  });

  // 下一关按钮
  addTouchClick(modalNext, () => {
    hideModal();
    const currentState = game.getState();
    game.init(currentState.level + 1);
  });

  // 弹窗重开按钮
  addTouchClick(modalRestart, () => {
    hideModal();
    game.init(1);
  });

  // 点击弹窗外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });

  // 定期检查是否无解（双重保障）
  setInterval(() => {
    const state = game.getState();
    if (state.isPlaying && !game.checkSolvable()) {
      game.reshuffle();
    }
  }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', initApp);

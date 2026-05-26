/**
 * 连连看游戏核心逻辑
 */

// 图案类型（使用 emoji）
const PATTERNS = [
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌺', '🌻', '🌹', '🌼', '🌷', '💐', '🌸',
  '⭐', '🌙', '☀️', '🌟', '💎', '🔮', '🎁', '🎀',
  '🐱', '🐶', '🐼', '🐨', '🦊', '🦁', '🐯', '🦄'
];

// 方向：上、右、下、左
const DIRECTIONS = [
  [-1, 0], [0, 1], [1, 0], [0, -1]
];

/**
 * 连连看游戏类
 */
class LinkGame {
  constructor(config = {}) {
    this.config = {
      rows: config.rows ?? 8,
      cols: config.cols ?? 10,
      timeLimit: config.timeLimit ?? 180,
      hints: config.hints ?? 3
    };
    
    this.state = this.createInitialState();
    this.timer = null;
    this.onStateChange = null;
    this.onPathShow = null;
  }

  /**
   * 创建初始状态
   */
  createInitialState() {
    return {
      board: [],
      selected: null,
      score: 0,
      time: this.config.timeLimit,
      hints: this.config.hints,
      isPlaying: false,
      isWin: false,
      level: 1,
      matchedPairs: 0,
      totalPairs: 0
    };
  }

  /**
   * 初始化游戏
   */
  init(level = 1) {
    // 停止之前的计时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // 根据关卡调整难度
    const patterns = Math.min(8 + level * 2, PATTERNS.length);
    
    // 生成棋盘
    const board = this.generateBoard(patterns);
    const totalPairs = (this.config.rows * this.config.cols) / 2;

    this.state = {
      board,
      selected: null,
      score: 0,
      time: this.config.timeLimit,
      hints: this.config.hints,
      isPlaying: true,
      isWin: false,
      level,
      matchedPairs: 0,
      totalPairs
    };

    // 启动计时器
    this.startTimer();
    this.notifyStateChange();
  }

  /**
   * 生成随机棋盘
   */
  generateBoard(patternCount) {
    const { rows, cols } = this.config;
    const totalCells = rows * cols;
    const pairsNeeded = totalCells / 2;

    // 创建图案对
    const patterns = [];
    for (let i = 0; i < pairsNeeded; i++) {
      const pattern = PATTERNS[i % patternCount];
      patterns.push(pattern, pattern);
    }

    // 打乱顺序
    this.shuffleArray(patterns);

    // 填充棋盘
    const board = [];
    let index = 0;
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        board[r][c] = patterns[index++];
      }
    }

    return board;
  }

  /**
   * 打乱数组
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * 启动计时器
   */
  startTimer() {
    this.timer = setInterval(() => {
      if (this.state.time > 0) {
        this.state.time--;
        this.notifyStateChange();
      } else {
        // 时间到，游戏结束
        this.state.isPlaying = false;
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.notifyStateChange();
      }
    }, 1000);
  }

  /**
   * 点击格子
   */
  click(row, col) {
    if (!this.state.isPlaying) return false;
    
    const { board, selected } = this.state;
    
    // 格子已被消除或不存在
    if (!board[row] || board[row][col] === null) return false;

    // 第一次选择
    if (!selected) {
      this.state.selected = { row, col };
      this.notifyStateChange();
      return true;
    }

    // 点击同一个格子，取消选择
    if (selected.row === row && selected.col === col) {
      this.state.selected = null;
      this.notifyStateChange();
      return true;
    }

    // 尝试匹配
    const pattern1 = board[selected.row][selected.col];
    const pattern2 = board[row][col];

    // 图案不同，切换选择
    if (pattern1 !== pattern2) {
      this.state.selected = { row, col };
      this.notifyStateChange();
      return false;
    }

    // 图案相同，检查路径
    const path = this.findPath(selected.row, selected.col, row, col);
    
    if (path) {
      // 匹配成功
      this.showPath(path);
      
      // 延迟消除
      setTimeout(() => {
        this.eliminate(selected.row, selected.col, row, col);
      }, 300);
      
      return true;
    } else {
      // 无法连接，切换选择
      this.state.selected = { row, col };
      this.notifyStateChange();
      return false;
    }
  }

  /**
   * 查找路径（BFS，最多2个拐点）
   */
  findPath(startRow, startCol, endRow, endCol) {
    const { rows, cols } = this.config;
    const { board } = this.state;

    // BFS 队列
    const queue = [{
      row: startRow,
      col: startCol,
      turns: 0,
      lastDirection: -1,
      path: [{ row: startRow, col: startCol }]
    }];

    // 访问标记
    const visited = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const { row, col, turns, lastDirection, path } = current;

      // 尝试四个方向
      for (let dir = 0; dir < 4; dir++) {
        let newRow = row + DIRECTIONS[dir][0];
        let newCol = col + DIRECTIONS[dir][1];

        // 计算新拐点数
        const newTurns = lastDirection === -1 || lastDirection === dir 
          ? turns 
          : turns + 1;

        // 拐点超过2个，跳过
        if (newTurns > 2) continue;

        // 沿当前方向前进直到碰到障碍或边界
        while (true) {
          // 越界检查
          if (newRow < -1 || newRow > rows || newCol < -1 || newCol > cols) break;

          // 到达终点
          if (newRow === endRow && newCol === endCol) {
            return [...path, { row: newRow, col: newCol }];
          }

          // 边界外格子
          const isOutOfBounds = newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols;
          
          // 检查是否可通行
          if (!isOutOfBounds && board[newRow][newCol] !== null) break;

          // 检查是否已访问
          const key = `${newRow},${newCol},${dir}`;
          const prevTurns = visited.get(key);
          if (prevTurns !== undefined && prevTurns <= newTurns) {
            newRow += DIRECTIONS[dir][0];
            newCol += DIRECTIONS[dir][1];
            continue;
          }
          
          visited.set(key, newTurns);

          // 加入队列
          queue.push({
            row: newRow,
            col: newCol,
            turns: newTurns,
            lastDirection: dir,
            path: [...path, { row: newRow, col: newCol }]
          });

          newRow += DIRECTIONS[dir][0];
          newCol += DIRECTIONS[dir][1];
        }
      }
    }

    return null;
  }

  /**
   * 显示连接路径
   */
  showPath(path) {
    if (this.onPathShow) {
      this.onPathShow(path);
    }
  }

  /**
   * 消除格子
   */
  eliminate(r1, c1, r2, c2) {
    this.state.board[r1][c1] = null;
    this.state.board[r2][c2] = null;
    this.state.selected = null;
    this.state.score += 10 + Math.floor(this.state.time / 10);
    this.state.matchedPairs++;

    // 检查胜利
    if (this.state.matchedPairs >= this.state.totalPairs) {
      this.state.isWin = true;
      this.state.isPlaying = false;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    } else {
      // 检查是否无解，如果无解则自动重排
      if (!this.checkSolvable()) {
        this.reshuffle();
      }
    }

    this.notifyStateChange();
  }

  /**
   * 使用提示
   */
  useHint() {
    if (!this.state.isPlaying || this.state.hints <= 0) return null;

    const { board } = this.state;
    const { rows, cols } = this.config;

    // 查找可消除的一对
    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        if (!board[r1][c1]) continue;

        for (let r2 = 0; r2 < rows; r2++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            if (!board[r2][c2]) continue;
            if (board[r1][c1] !== board[r2][c2]) continue;

            const path = this.findPath(r1, c1, r2, c2);
            if (path) {
              this.state.hints--;
              this.notifyStateChange();
              return { row1: r1, col1: c1, row2: r2, col2: c2 };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * 重新排列
   */
  reshuffle() {
    if (!this.state.isPlaying) return;

    const { board } = this.state;
    const { rows, cols } = this.config;

    // 收集未消除的图案
    const patterns = [];
    const positions = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c]) {
          patterns.push(board[r][c]);
          positions.push({ row: r, col: c });
        }
      }
    }

    // 尝试重排，确保有解
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // 打乱
      this.shuffleArray(patterns);

      // 重新放置
      for (let i = 0; i < positions.length; i++) {
        const { row, col } = positions[i];
        board[row][col] = patterns[i];
      }
      
      attempts++;
    } while (!this.checkSolvable() && attempts < maxAttempts);

    this.notifyStateChange();
  }

  /**
   * 检查是否无解
   */
  checkSolvable() {
    const { board } = this.state;
    const { rows, cols } = this.config;

    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        if (!board[r1][c1]) continue;

        for (let r2 = 0; r2 < rows; r2++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            if (!board[r2][c2]) continue;
            if (board[r1][c1] !== board[r2][c2]) continue;

            const path = this.findPath(r1, c1, r2, c2);
            if (path) return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 获取状态
   */
  getState() {
    return this.state;
  }

  /**
   * 设置状态变化回调
   */
  onState(callback) {
    this.onStateChange = callback;
  }

  /**
   * 设置路径显示回调
   */
  onPath(callback) {
    this.onPathShow = callback;
  }

  /**
   * 通知状态变化
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// 导出
window.LinkGame = LinkGame;

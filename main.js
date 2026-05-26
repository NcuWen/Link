/**
 * 连连看游戏核心逻辑
 */

// 图案类型（使用 emoji）- 确保每个图案都是唯一的
// 使用数字索引 0-31 作为内部标识，避免 emoji 跨平台兼容问题
const PATTERNS = [
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌺', '🌻', '🌹', '🌼', '🌷', '💐', '🍁',
  '⭐', '🌙', '☀', '🌟', '💎', '🔮', '🎁', '🎀',
  '🐱', '🐶', '🐼', '🐨', '🦊', '🦁', '🐯', '🦄'
];

console.log(`PATTERNS数组：${PATTERNS.length}个图案`);

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
      totalPairs,
      showingPath: false  // 是否正在显示路径
    };

    // 启动计时器
    this.startTimer();
    this.notifyStateChange();
  }

  /**
   * 生成随机棋盘
   * 内部存储数字索引（0-31），避免 emoji 跨平台比较问题
   */
  generateBoard(patternCount) {
    const { rows, cols } = this.config;
    const totalCells = rows * cols;
    const pairsNeeded = totalCells / 2;

    console.log(`[generateBoard] rows=${rows}, cols=${cols}, totalCells=${totalCells}, pairsNeeded=${pairsNeeded}, patternCount=${patternCount}`);

    // 创建图案索引对 - 使用数字索引确保唯一性
    // 均匀分配每种图案的数量
    const patternIndices = [];
    
    // 计算每种图案应该有多少对
    const basePairsPerPattern = Math.floor(pairsNeeded / patternCount);
    let remainingPairs = pairsNeeded - (basePairsPerPattern * patternCount);
    
    console.log(`[generateBoard] basePairsPerPattern=${basePairsPerPattern}, remainingPairs=${remainingPairs}`);
    
    // 为每种图案添加成对的索引
    for (let i = 0; i < patternCount; i++) {
      // 基础数量
      const pairsForThisPattern = basePairsPerPattern + (remainingPairs > 0 ? 1 : 0);
      if (remainingPairs > 0) {
        remainingPairs--;
      }
      
      // 添加成对的图案索引（每次加2个，确保偶数）
      for (let j = 0; j < pairsForThisPattern; j++) {
        patternIndices.push(i);
        patternIndices.push(i);
      }
    }

    console.log(`[generateBoard] patternIndices数组长度=${patternIndices.length}, 应该是${totalCells}`);

    // 验证数组长度和配对
    if (patternIndices.length !== totalCells) {
      console.error(`[generateBoard] 严重错误：patternIndices长度 ${patternIndices.length} 不等于总格子数 ${totalCells}`);
      console.error(`[generateBoard] 这不应该发生，请检查算法逻辑`);
      
      // 如果长度不匹配，重新生成
      return this.generateBoard(patternCount);
    }

    // 验证每种图案索引数量都是偶数
    const counts = {};
    for (const idx of patternIndices) {
      counts[idx] = (counts[idx] || 0) + 1;
    }
    
    let hasOddPattern = false;
    for (const [idx, count] of Object.entries(counts)) {
      if (count % 2 !== 0) {
        console.error(`生成棋盘时图案索引 ${idx} 数量是奇数: ${count}`);
        hasOddPattern = true;
      }
    }
    
    if (hasOddPattern) {
      console.error(`[generateBoard] 检测到奇数配对，重新生成棋盘`);
      return this.generateBoard(patternCount);
    } else {
      console.log(`[generateBoard] 所有图案数量都是偶数，验证通过`);
      // 打印每种图案的数量
      for (const [idx, count] of Object.entries(counts)) {
        console.log(`[generateBoard] 图案 ${idx}: ${count} 个 (${count/2} 对)`);
      }
    }

    // 打乱顺序
    this.shuffleArray(patternIndices);

    // 填充棋盘 - 存储数字索引
    const board = [];
    let index = 0;
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        board[r][c] = patternIndices[index++];
      }
    }

    // 最终验证棋盘
    const finalCounts = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = board[r][c];
        finalCounts[idx] = (finalCounts[idx] || 0) + 1;
      }
    }
    
    let finalHasOdd = false;
    for (const [idx, count] of Object.entries(finalCounts)) {
      if (count % 2 !== 0) {
        console.error(`[generateBoard] 最终棋盘中图案索引 ${idx} 数量是奇数: ${count}`);
        finalHasOdd = true;
      }
    }
    
    if (!finalHasOdd) {
      console.log(`[generateBoard] 最终棋盘验证通过，所有图案都是成对的`);
    } else {
      console.error(`[generateBoard] 最终棋盘验证失败，重新生成`);
      return this.generateBoard(patternCount);
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
    
    // 正在显示路径，禁止点击
    if (this.state.showingPath) return false;
    
    const { board, selected } = this.state;
    
    // 格子已被消除或不存在
    if (!board[row] || board[row][col] === null || board[row][col] === undefined) return false;

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

    console.log(`[click] 比较图案索引: ${pattern1} vs ${pattern2}, 相同=${pattern1 === pattern2}`);

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
      this.state.showingPath = true;  // 标记正在显示路径
      this.showPath(path);
      
      // 延迟消除
      setTimeout(() => {
        this.state.showingPath = false;  // 清除标记
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
    // 验证两个格子的图案相同
    const pattern1 = this.state.board[r1][c1];
    const pattern2 = this.state.board[r2][c2];
    if (pattern1 !== pattern2) {
      console.error(`消除错误：图案不同！${pattern1} !== ${pattern2}`);
      return;
    }
    
    this.state.board[r1][c1] = null;
    this.state.board[r2][c2] = null;
    this.state.selected = null;
    this.state.score += 10 + Math.floor(this.state.time / 10);
    this.state.matchedPairs++;

    // 验证消除后图案数量仍然正确
    this.verifyBoard();

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
   * 验证棋盘状态
   */
  verifyBoard() {
    const { board } = this.state;
    const { rows, cols } = this.config;
    
    const counts = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = board[r][c];
        if (p !== null && p !== undefined) {
          counts[p] = (counts[p] || 0) + 1;
        }
      }
    }
    
    for (const [p, count] of Object.entries(counts)) {
      if (count % 2 !== 0) {
        console.error(`棋盘验证失败：图案 ${p} 数量是奇数: ${count}`);
      }
    }
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
        if (board[r1][c1] === null || board[r1][c1] === undefined) continue;

        for (let r2 = 0; r2 < rows; r2++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            if (board[r2][c2] === null || board[r2][c2] === undefined) continue;
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
        if (board[r][c] !== null && board[r][c] !== undefined) {
          patterns.push(board[r][c]);
          positions.push({ row: r, col: c });
        }
      }
    }

    // 检查每种图案数量是否都是偶数
    const patternCounts = new Map();
    for (const p of patterns) {
      patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
    }
    
    for (const [pattern, count] of patternCounts) {
      if (count % 2 !== 0) {
        console.error(`重排前发现图案 ${pattern} 数量是奇数: ${count}，这不应该发生！`);
      }
    }

    // 如果没有剩余格子，直接返回
    if (patterns.length === 0) return;

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
    
    if (attempts >= maxAttempts) {
      console.warn(`重排 ${maxAttempts} 次后仍无解，可能是路径查找算法有问题`);
    }

    this.notifyStateChange();
  }

  /**
   * 检查是否无解
   */
  checkSolvable() {
    const { board } = this.state;
    const { rows, cols } = this.config;

    // 先检查每种图案的数量是否都是偶数
    const patternCounts = new Map();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = board[r][c];
        if (p !== null && p !== undefined) {
          patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
        }
      }
    }
    
    // 如果有任何图案数量是奇数，说明有问题
    for (const [pattern, count] of patternCounts) {
      if (count % 2 !== 0) {
        console.error(`图案 ${pattern} 的数量是奇数: ${count}`);
        return false;
      }
    }

    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        if (board[r1][c1] === null || board[r1][c1] === undefined) continue;

        for (let r2 = 0; r2 < rows; r2++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            if (board[r2][c2] === null || board[r2][c2] === undefined) continue;
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

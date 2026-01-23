/**
 * 网格菜单模块
 * 使用原生 readline 实现支持上下左右的网格菜单
 * v7.3 - 完善全局监听器管理，防止重复resolve和监听器泄露
 */

const readline = require('readline');

// ═══════════════ 全局状态管理 ═══════════════
// 跟踪当前活动的监听器，确保只有一个活动
let activeKeyListener = null;
let isRawMode = false;

/**
 * 安全设置 raw mode
 */
function safeSetRawMode(enable) {
  try {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(enable);
      isRawMode = enable;
    }
  } catch (e) {
    // 忽略错误
  }
}

/**
 * 安全移除所有 keypress 监听器
 */
function safeRemoveKeyListeners() {
  if (activeKeyListener) {
    process.stdin.removeListener('keypress', activeKeyListener);
    activeKeyListener = null;
  }
  // 额外清理：移除所有 keypress 监听器
  process.stdin.removeAllListeners('keypress');
}

/**
 * 安全添加 keypress 监听器（确保唯一）
 */
function safeAddKeyListener(handler) {
  safeRemoveKeyListeners();
  activeKeyListener = handler;
  readline.emitKeypressEvents(process.stdin);
  process.stdin.on('keypress', handler);
}

// ═══════════════ 布局配置 ═══════════════
const LAYOUT = {
  maxWidth: 72,        // 最大宽度限制
  minWidth: 56,        // 最小宽度
};

// ═══════════════ ANSI 颜色码 ═══════════════
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // 背景色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

// ═══════════════ Box Drawing 字符 ═══════════════
const B = {
  tl: '╭', tr: '╮', bl: '╰', br: '╯',
  h: '─', v: '│',
  lt: '├', rt: '┤',
};

// ═══════════════ 工具函数 ═══════════════

/**
 * 获取字符显示宽度
 */
function getCharWidth(char) {
  // 简单判断：非 ASCII 字符视为全角（宽度2）
  // 包含汉字、全角标点、Emoji 等
  return char.charCodeAt(0) > 255 ? 2 : 1;
}

/**
 * 计算实际显示宽度（考虑中文字符）
 */
function displayWidth(str) {
  // 移除 ANSI 转义序列
  const clean = str.replace(/\x1b\[[0-9;]*m/g, '');
  let width = 0;
  for (const char of clean) {
    width += getCharWidth(char);
  }
  return width;
}

/**
 * 获取有效宽度（固定使用 maxWidth，不随终端变化）
 */
function getWidth() {
  return LAYOUT.maxWidth;
}

/**
 * 获取终端居中的左边距
 */
function getLeftPadding() {
  const term = process.stdout.columns || 80;
  const width = getWidth();
  return Math.max(0, Math.floor((term - width) / 2));
}

/**
 * 居中填充
 */
function center(text, w) {
  const tw = displayWidth(text);
  const left = Math.floor((w - tw) / 2);
  const right = w - tw - left;
  return ' '.repeat(Math.max(0, left)) + text + ' '.repeat(Math.max(0, right));
}

/**
 * 左对齐填充
 */
function padRight(text, w) {
  const tw = displayWidth(text);
  return text + ' '.repeat(Math.max(0, w - tw));
}

/**
 * 截断文本
 */
function truncate(text, maxW) {
  let w = 0;
  let result = '';
  for (const char of text) {
    const cw = getCharWidth(char);
    if (w + cw > maxW - 2) {
      result += '..';
      break;
    }
    result += char;
    w += cw;
  }
  return displayWidth(text) > maxW ? result : text;
}

/**
 * 按宽度分割文本
 */
function splitByWidth(text, width) {
  const lines = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const char of text) {
    const charWidth = getCharWidth(char);
    if (currentWidth + charWidth > width) {
      lines.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * 移动光标到指定位置
 */
function moveTo(row, col) {
  process.stdout.write(`\x1b[${row};${col}H`);
}

/**
 * 进入全屏模式（备用屏幕缓冲区）
 */
function enterFullscreen() {
  process.stdout.write('\x1b[?1049h'); // 进入备用屏幕
  process.stdout.write('\x1b[?25l');   // 隐藏光标
}

/**
 * 退出全屏模式
 */
function exitFullscreen() {
  process.stdout.write('\x1b[?25h');   // 显示光标
  process.stdout.write('\x1b[?1049l'); // 退出备用屏幕
}

// ═══════════════ 主菜单 ═══════════════

function createGridMenu(options) {
  const {
    title = 'OpenCode 汉化管理工具',
    statusLines = [],
    items = [],
    columns = 3,
    onAsyncUpdate = null,  // 异步更新回调
    tutorials = [],        // 教程数据 [{ title: '标题', content: ['行1', '行2'] }]
  } = options;

  return new Promise((resolve) => {
    let selected = 0;
    let currentTab = 0; // 当前选中的教程 Tab
    let dynamicStatusLines = [...statusLines];
    const rowCount = Math.ceil(items.length / columns);
    const width = getWidth();
    const inner = width - 2;
    const cellW = Math.floor(inner / columns);

    const c = colors;
    const line = (char, w) => char.repeat(w);

    // 计算教程区域高度
    function getTutorialHeight() {
      if (!tutorials || tutorials.length === 0) return 0;
      // 分隔线(1) + Tabs(1) + 内容最大高度 + 底部Padding(0)
      const maxContentHeight = Math.max(...tutorials.map(t => t.content.length));
      return 1 + 1 + maxContentHeight;
    }

    // 计算垂直居中的起始行
    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      // 增加 3 行用于动态描述区 (Separator + Description 2 lines)
      const menuHeight = 3 + dynamicStatusLines.length + 1 + 1 + rowCount * 2 + 1 + 3 + 3 + getTutorialHeight();
      return Math.max(1, Math.floor((termRows - menuHeight) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.tl}${line(B.h, inner)}${B.tr}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.bold}${c.white}${center(title, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${line(B.h, inner)}${B.rt}${c.reset}`);

      // ════════ 状态区 ════════
      if (dynamicStatusLines.length > 0) {
        for (const sl of dynamicStatusLines) {
          let text = sl
            .replace(/\{yellow-fg\}/g, c.yellow)
            .replace(/\{cyan-fg\}/g, c.cyan)
            .replace(/\{green-fg\}/g, c.green)
            .replace(/\{red-fg\}/g, c.red)
            .replace(/\{white-fg\}/g, c.white)
            .replace(/\{gray-fg\}/g, c.gray)
            .replace(/\{\/[^}]+\}/g, c.reset);

          const plain = sl.replace(/\{[^}]+\}/g, '');
          const pw = displayWidth(plain);
          const spacing = ' '.repeat(Math.max(0, inner - pw - 2));

          moveTo(row++, 1);
          process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset} ${text}${spacing} ${c.cyan}${B.v}${c.reset}`);
        }
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.lt}${line(B.h, inner)}${B.rt}${c.reset}`);
      }

      // ════════ 菜单区 ════════
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);

      for (let r = 0; r < rowCount; r++) {
        let rowStr = '';
        for (let col = 0; col < columns; col++) {
          const idx = r * columns + col;
          if (idx < items.length) {
            const item = items[idx];
            const isSel = idx === selected;
            const name = truncate(item.name, cellW - 2);
            const text = padRight(name, cellW - 1);

            if (isSel) {
              rowStr += `${c.bgWhite}${c.black}${c.bold} ${text}${c.reset}`;
            } else {
              rowStr += ` ${c.white}${text}${c.reset}`;
            }
          } else {
            rowStr += ' '.repeat(cellW);
          }
        }

        const rowW = columns * cellW;
        const extra = inner - rowW;
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${rowStr}${' '.repeat(Math.max(0, extra))}${c.cyan}${B.v}${c.reset}`);

        if (r < rowCount - 1) {
          moveTo(row++, 1);
          process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);
        }
      }

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);

      // ════════ 动态描述区 ════════
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${line(B.h, inner)}${B.rt}${c.reset}`);

      const currentDesc = items[selected].desc || '';
      const descLines = splitByWidth(currentDesc, inner - 4); // 左右各留2空格
      
      // 确保显示两行（保持高度稳定）
      while (descLines.length < 2) descLines.push('');
      
      for (let i = 0; i < 2; i++) {
        const lineText = i < descLines.length ? descLines[i] : '';
        // 如果超过2行，第2行末尾显示...
        const displayText = (i === 1 && descLines.length > 2) ? truncate(lineText, inner - 4) : lineText;
        
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.yellow}${center(displayText, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);
      }

      // ════════ 教程板块 ════════
      if (tutorials && tutorials.length > 0) {
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.lt}${line(B.h, inner)}${B.rt}${c.reset}`);

        // 渲染 Tabs (增加上下空行)
        let tabsStr = '';
        for (let i = 0; i < tutorials.length; i++) {
          const t = tutorials[i];
          const isActive = i === currentTab;
          if (isActive) {
            tabsStr += `${c.bgWhite}${c.black}${c.bold} ${t.title} ${c.reset} `;
          } else {
            tabsStr += `${c.dim} ${t.title} ${c.reset} `;
          }
        }
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset} ${tabsStr}${c.reset}${' '.repeat(Math.max(0, inner - displayWidth(tabsStr) - 1))}${c.cyan}${B.v}${c.reset}`);

        // 渲染内容
        const activeTutorial = tutorials[currentTab];
        const maxLines = Math.max(...tutorials.map(t => t.content.length));

        for (let i = 0; i < maxLines; i++) {
          const contentLine = activeTutorial.content[i] || '';
          // 处理内容颜色替换
          const renderedLine = contentLine
            .replace(/\{cyan\}/g, c.cyan)
            .replace(/\{yellow\}/g, c.yellow)
            .replace(/\{green\}/g, c.green)
            .replace(/\{red\}/g, c.red)
            .replace(/\{blue\}/g, c.blue)
            .replace(/\{magenta\}/g, c.magenta)
            .replace(/\{white\}/g, c.white)
            .replace(/\{gray\}/g, c.gray)
            .replace(/\{dim\}/g, c.dim)
            .replace(/\{bold\}/g, c.bold)
            .replace(/\{\/\}/g, c.reset);

          // 彻底去除所有标记用于计算宽度
          const plainLine = contentLine.replace(/\{[^}]+\}/g, '');
          const padding = inner - displayWidth(plainLine) - 2;

          moveTo(row++, 1);
          process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset} ${renderedLine}${' '.repeat(Math.max(0, padding))} ${c.cyan}${B.v}${c.reset}`);
        }
      }

      // ════════ 底部提示 ════════
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${line(B.h, inner)}${B.rt}${c.reset}`);

      let hint = '↑↓←→ 移动 │ Enter 确认 │ 1-9 快捷 │ Q 退出';
      if (tutorials && tutorials.length > 0) {
        hint += ' │ Tab 切换教程';
      }
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(hint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.bl}${line(B.h, inner)}${B.br}${c.reset}`);
    }

    // 异步更新状态行（检查是否已关闭）
    function updateStatusLines(newLines) {
      if (isResolved) return;  // 菜单已关闭，不再更新
      dynamicStatusLines = newLines;
      render();
    }

    function move(dir) {
      const row = Math.floor(selected / columns);
      const col = selected % columns;

      switch (dir) {
        case 'up':
          selected = row > 0 ? selected - columns : Math.min((rowCount - 1) * columns + col, items.length - 1);
          break;
        case 'down':
          selected = selected + columns < items.length ? selected + columns : col;
          break;
        case 'left':
          selected = selected > 0 ? selected - 1 : items.length - 1;
          break;
        case 'right':
          selected = selected < items.length - 1 ? selected + 1 : 0;
          break;
      }
      render();
    }

    let isResolved = false;

    enterFullscreen();
    render();

    // 启动异步更新检测
    if (onAsyncUpdate) {
      onAsyncUpdate(updateStatusLines);
    }

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey(str, key) {
      if (isResolved) return;
      if (!key) return;

      if (key.name === 'escape' || key.name === 'q') {
        cleanup();
        resolve('exit');
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve(items[selected].value);
        return;
      }

      if (key.name === 'tab') {
        if (tutorials && tutorials.length > 0) {
          currentTab = (currentTab + 1) % tutorials.length;
          render();
        }
        return;
      }

      if (key.name === 'up' || str === 'k') move('up');
      else if (key.name === 'down' || str === 'j') move('down');
      else if (key.name === 'left' || str === 'h') move('left');
      else if (key.name === 'right' || str === 'l') move('right');

      const num = parseInt(str, 10);
      if (num >= 1 && num <= 9 && num <= items.length) {
        cleanup();
        resolve(items[num - 1].value);
        return;
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

// ═══════════════ 确认对话框 ═══════════════

function confirm(message, defaultValue = true) {
  return new Promise((resolve) => {
    let sel = defaultValue;
    const width = Math.min(56, getWidth());
    const inner = width - 2;
    const c = colors;

    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      return Math.max(1, Math.floor((termRows - 6) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${center(message, inner)}${c.cyan}${B.v}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);

      const yes = sel ? `${c.bgGreen}${c.white}${c.bold} 是(Y) ${c.reset}` : `${c.dim} 是(Y) ${c.reset}`;
      const no = !sel ? `${c.bgRed}${c.white}${c.bold} 否(N) ${c.reset}` : `${c.dim} 否(N) ${c.reset}`;
      const btns = `${yes}    ${no}`;

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${center(btns, inner + 20)}${c.cyan}${B.v}${c.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);
    }

    let isResolved = false;

    enterFullscreen();
    render();

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey(str, key) {
      if (isResolved) return;
      if (!key) return;

      if (key.name === 'y' || str === 'Y') { cleanup(); resolve(true); return; }
      if (key.name === 'n' || str === 'N' || key.name === 'escape') { cleanup(); resolve(false); return; }
      if (key.name === 'return') { cleanup(); resolve(sel); return; }
      if (key.name === 'left' || key.name === 'right' || key.name === 'tab') { sel = !sel; render(); }
      if (key.ctrl && key.name === 'c') { cleanup(); process.exit(0); }
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

// ═══════════════ 消息提示 ═══════════════

function showMessage(message, type = 'info') {
  return new Promise((resolve) => {
    const width = Math.min(56, getWidth());
    const inner = width - 2;

    const colorMap = { info: colors.cyan, success: colors.green, error: colors.red, warn: colors.yellow };
    const c = colorMap[type] || colors.cyan;

    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      return Math.max(1, Math.floor((termRows - 6) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c}${B.tl}${B.h.repeat(inner)}${B.tr}${colors.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c}${B.v}${colors.reset}${center(message, inner)}${c}${B.v}${colors.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c}${B.v}${colors.reset}${' '.repeat(inner)}${c}${B.v}${colors.reset}`);

      const hint = '按任意键继续...';
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c}${B.v}${colors.reset}${colors.dim}${center(hint, inner)}${colors.reset}${c}${B.v}${colors.reset}`);

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c}${B.bl}${B.h.repeat(inner)}${B.br}${colors.reset}`);
    }

    let isResolved = false;

    enterFullscreen();
    render();

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey() {
      if (isResolved) return;
      cleanup();
      resolve();
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

/**
 * 等待按键继续（在主屏幕使用，不切换备用屏幕）
 */
function waitForKey(message = '按任意键返回菜单...') {
  return new Promise((resolve) => {
    console.log(`\n${colors.dim}${message}${colors.reset}`);

    let isResolved = false;

    function onKey() {
      if (isResolved) return;
      isResolved = true;
      safeSetRawMode(false);
      safeRemoveKeyListeners();
      resolve();
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

// ═══════════════ 输入框 ═══════════════

/**
 * 显示输入框（TUI 风格）
 */
function showInputBox(options) {
  const {
    title = '请输入',
    placeholder = '',
    defaultValue = '',
    password = false,
  } = options;

  return new Promise((resolve) => {
    let value = defaultValue;
    let cursorPos = value.length;
    const width = Math.min(60, getWidth());
    const inner = width - 2;
    const c = colors;

    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      return Math.max(1, Math.floor((termRows - 8) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();

      // 顶部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);

      // 标题
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.bold}${center(title, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 分隔线
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);

      // 空行
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);

      // 输入框
      const inputWidth = inner - 4;
      const displayValue = password ? '*'.repeat(value.length) : value;
      const showPlaceholder = value.length === 0 && placeholder;
      const inputText = showPlaceholder ? placeholder : displayValue;
      const inputColor = showPlaceholder ? c.dim : c.white;

      // 截断显示（如果太长）
      let visibleText = inputText;
      if (displayWidth(visibleText) > inputWidth) {
        visibleText = visibleText.slice(-inputWidth + 3);
        visibleText = '...' + visibleText;
      }

      const textWidth = displayWidth(visibleText);
      const inputPad = ' '.repeat(Math.max(0, inputWidth - textWidth));

      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}  ${c.bgGray}${inputColor} ${visibleText}${inputPad} ${c.reset}  ${c.cyan}${B.v}${c.reset}`);

      // 空行
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${' '.repeat(inner)}${c.cyan}${B.v}${c.reset}`);

      // 提示
      const hint = 'Enter 确认 │ Esc 取消';
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(hint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 底部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);

      // 显示光标
      process.stdout.write('\x1b[?25h');
    }

    let isResolved = false;

    enterFullscreen();
    render();

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey(str, key) {
      if (isResolved) return;

      if (!key) {
        // 普通字符输入
        if (str && str.length === 1 && str.charCodeAt(0) >= 32) {
          value = value.slice(0, cursorPos) + str + value.slice(cursorPos);
          cursorPos++;
          render();
        }
        return;
      }

      if (key.name === 'escape') {
        cleanup();
        resolve(null); // 取消
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve(value || defaultValue);
        return;
      }

      if (key.name === 'backspace') {
        if (cursorPos > 0) {
          value = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          cursorPos--;
          render();
        }
        return;
      }

      if (key.name === 'delete') {
        if (cursorPos < value.length) {
          value = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
          render();
        }
        return;
      }

      if (key.name === 'left') {
        if (cursorPos > 0) cursorPos--;
        return;
      }

      if (key.name === 'right') {
        if (cursorPos < value.length) cursorPos++;
        return;
      }

      if (key.name === 'home') {
        cursorPos = 0;
        return;
      }

      if (key.name === 'end') {
        cursorPos = value.length;
        return;
      }

      // 普通字符
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        value = value.slice(0, cursorPos) + str + value.slice(cursorPos);
        cursorPos++;
        render();
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

// ═══════════════ 选择列表 ═══════════════

/**
 * 显示选择列表
 */
function showSelectList(options) {
  const {
    title = '请选择',
    items = [],
    defaultIndex = 0,
  } = options;

  return new Promise((resolve) => {
    let selected = defaultIndex;
    const width = Math.min(60, getWidth());
    const inner = width - 2;
    const c = colors;
    const maxVisible = 8; // 最多显示 8 项
    let scrollOffset = 0;

    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      const visibleCount = Math.min(items.length, maxVisible);
      const height = 5 + visibleCount;
      return Math.max(1, Math.floor((termRows - height) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();

      // 调整滚动偏移
      if (selected < scrollOffset) scrollOffset = selected;
      if (selected >= scrollOffset + maxVisible) scrollOffset = selected - maxVisible + 1;

      const visibleItems = items.slice(scrollOffset, scrollOffset + maxVisible);

      // 顶部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);

      // 标题
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.bold}${center(title, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 分隔线
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);

      // 列表项
      for (let i = 0; i < visibleItems.length; i++) {
        const realIndex = scrollOffset + i;
        const item = visibleItems[i];
        const isSel = realIndex === selected;
        const label = typeof item === 'string' ? item : item.label || item.name;
        const text = truncate(label, inner - 6);

        moveTo(row++, 1);
        if (isSel) {
          process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}  ${c.bgWhite}${c.black}${c.bold} ▸ ${padRight(text, inner - 6)} ${c.reset}${c.cyan}${B.v}${c.reset}`);
        } else {
          process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}    ${c.white}${padRight(text, inner - 6)} ${c.reset}${c.cyan}${B.v}${c.reset}`);
        }
      }

      // 滚动提示
      if (items.length > maxVisible) {
        const scrollHint = `${scrollOffset + 1}-${Math.min(scrollOffset + maxVisible, items.length)} / ${items.length}`;
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(scrollHint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);
      }

      // 提示
      const hint = '↑↓ 选择 │ Enter 确认 │ Esc 取消';
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(hint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 底部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);
    }

    let isResolved = false;

    enterFullscreen();
    render();

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey(str, key) {
      if (isResolved) return;
      if (!key) return;

      if (key.name === 'escape') {
        cleanup();
        resolve(null);
        return;
      }

      if (key.name === 'return') {
        cleanup();
        const item = items[selected];
        resolve(typeof item === 'string' ? item : item.value || item);
        return;
      }

      if (key.name === 'up' || str === 'k') {
        selected = selected > 0 ? selected - 1 : items.length - 1;
        render();
      }

      if (key.name === 'down' || str === 'j') {
        selected = selected < items.length - 1 ? selected + 1 : 0;
        render();
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

// ═══════════════ 多选列表（支持搜索） ═══════════════

/**
 * 显示多选列表（支持搜索过滤）
 * @param {Object} options 配置选项
 * @param {string} options.title 标题
 * @param {Array} options.items 选项列表 [{id, name, selected?}]
 * @param {Array} options.defaultSelected 默认选中的ID列表
 * @param {number} options.maxVisible 最大可见行数
 * @returns {Promise<Array>} 选中的项目列表
 */
function showMultiSelectList(options) {
  const {
    title = '请选择（空格切换，Enter确认）',
    items = [],
    defaultSelected = [],
    maxVisible = 12,
  } = options;

  return new Promise((resolve) => {
    let cursor = 0;
    let scrollOffset = 0;
    let searchText = '';
    let isSearchMode = false;

    // 初始化选中状态
    const selectedSet = new Set(defaultSelected);

    const width = Math.min(70, getWidth());
    const inner = width - 2;
    const c = colors;

    // 过滤后的项目
    function getFilteredItems() {
      if (!searchText) return items;
      const lower = searchText.toLowerCase();
      return items.filter(item => {
        const name = (item.name || item.id || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        return name.includes(lower) || id.includes(lower);
      });
    }

    function getStartRow() {
      const termRows = process.stdout.rows || 24;
      const visibleCount = Math.min(getFilteredItems().length, maxVisible);
      const height = 7 + visibleCount + (searchText ? 1 : 0);
      return Math.max(1, Math.floor((termRows - height) / 2));
    }

    function render() {
      clearScreen();
      const pad = ' '.repeat(getLeftPadding());
      let row = getStartRow();
      const filtered = getFilteredItems();

      // 调整滚动和光标
      if (cursor >= filtered.length) cursor = Math.max(0, filtered.length - 1);
      if (cursor < scrollOffset) scrollOffset = cursor;
      if (cursor >= scrollOffset + maxVisible) scrollOffset = cursor - maxVisible + 1;

      const visibleItems = filtered.slice(scrollOffset, scrollOffset + maxVisible);

      // 顶部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);

      // 标题
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.bold}${center(title, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 分隔线
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);

      // 搜索框
      const searchDisplay = isSearchMode
        ? `${c.yellow}搜索: ${searchText}▌${c.reset}`
        : (searchText ? `${c.dim}搜索: ${searchText} (按/编辑)${c.reset}` : `${c.dim}按 / 开始搜索${c.reset}`);
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset} ${padRight(searchDisplay, inner - 2)} ${c.cyan}${B.v}${c.reset}`);

      // 分隔线
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);

      // 列表项
      if (filtered.length === 0) {
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center('无匹配项', inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);
      } else {
        for (let i = 0; i < visibleItems.length; i++) {
          const realIndex = scrollOffset + i;
          const item = visibleItems[i];
          const itemId = item.id || item;
          const itemName = item.name || item.id || item;
          const isSelected = selectedSet.has(itemId);
          const isCursor = realIndex === cursor;

          const checkbox = isSelected ? `${c.green}[✓]${c.reset}` : `${c.dim}[ ]${c.reset}`;
          const displayName = truncate(itemName, inner - 10);

          moveTo(row++, 1);
          if (isCursor) {
            process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset} ${c.bgWhite}${c.black}${c.bold} ${checkbox} ${padRight(displayName, inner - 8)} ${c.reset}${c.cyan}${B.v}${c.reset}`);
          } else {
            process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}  ${checkbox} ${c.white}${padRight(displayName, inner - 8)} ${c.reset}${c.cyan}${B.v}${c.reset}`);
          }
        }
      }

      // 滚动提示
      if (filtered.length > maxVisible) {
        const scrollHint = `${scrollOffset + 1}-${Math.min(scrollOffset + maxVisible, filtered.length)} / ${filtered.length}`;
        moveTo(row++, 1);
        process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(scrollHint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);
      }

      // 统计
      const stats = `已选: ${selectedSet.size} / ${items.length}`;
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.green}${center(stats, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 提示
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.lt}${B.h.repeat(inner)}${B.rt}${c.reset}`);

      const hint = isSearchMode
        ? 'Enter 结束搜索 │ Esc 取消搜索'
        : '↑↓ 移动 │ Space 切换 │ / 搜索 │ A 全选 │ Enter 确认';
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.v}${c.reset}${c.dim}${center(hint, inner)}${c.reset}${c.cyan}${B.v}${c.reset}`);

      // 底部边框
      moveTo(row++, 1);
      process.stdout.write(`${pad}${c.cyan}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);
    }

    let isResolved = false;

    enterFullscreen();
    render();

    function cleanup() {
      if (isResolved) return;
      isResolved = true;
      exitFullscreen();
      safeSetRawMode(false);
      safeRemoveKeyListeners();
    }

    function onKey(str, key) {
      if (isResolved) return;

      const filtered = getFilteredItems();

      // 搜索模式
      if (isSearchMode) {
        if (!key) {
          if (str && str.length === 1 && str.charCodeAt(0) >= 32) {
            searchText += str;
            cursor = 0;
            scrollOffset = 0;
            render();
          }
          return;
        }

        if (key.name === 'return') {
          isSearchMode = false;
          render();
          return;
        }

        if (key.name === 'escape') {
          isSearchMode = false;
          searchText = '';
          cursor = 0;
          scrollOffset = 0;
          render();
          return;
        }

        if (key.name === 'backspace') {
          searchText = searchText.slice(0, -1);
          cursor = 0;
          scrollOffset = 0;
          render();
          return;
        }

        if (str && str.length === 1 && !key.ctrl && !key.meta) {
          searchText += str;
          cursor = 0;
          scrollOffset = 0;
          render();
        }
        return;
      }

      // 普通模式
      if (!key) return;

      if (key.name === 'escape') {
        cleanup();
        resolve(null);
        return;
      }

      if (key.name === 'return') {
        cleanup();
        // 返回选中的项目
        const result = items.filter(item => selectedSet.has(item.id || item));
        resolve(result);
        return;
      }

      if (key.name === 'up' || str === 'k') {
        cursor = cursor > 0 ? cursor - 1 : filtered.length - 1;
        render();
        return;
      }

      if (key.name === 'down' || str === 'j') {
        cursor = cursor < filtered.length - 1 ? cursor + 1 : 0;
        render();
        return;
      }

      if (key.name === 'space') {
        if (filtered.length > 0 && cursor < filtered.length) {
          const item = filtered[cursor];
          const itemId = item.id || item;
          if (selectedSet.has(itemId)) {
            selectedSet.delete(itemId);
          } else {
            selectedSet.add(itemId);
          }
          render();
        }
        return;
      }

      // / 进入搜索模式
      if (str === '/') {
        isSearchMode = true;
        render();
        return;
      }

      // A 全选/取消全选
      if (str === 'a' || str === 'A') {
        const allSelected = filtered.every(item => selectedSet.has(item.id || item));
        filtered.forEach(item => {
          const itemId = item.id || item;
          if (allSelected) {
            selectedSet.delete(itemId);
          } else {
            selectedSet.add(itemId);
          }
        });
        render();
        return;
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    }

    safeSetRawMode(true);
    safeAddKeyListener(onKey);
  });
}

module.exports = { createGridMenu, confirm, showMessage, waitForKey, showInputBox, showSelectList, showMultiSelectList };

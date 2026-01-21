/**
 * 统一的颜色输出模块
 * 使用 clack 风格的视觉设计
 */

const PLAIN_MODE = ["1", "true", "yes"].includes(
  String(process.env.OPENCODECN_PLAIN || "").toLowerCase(),
);

const colors = PLAIN_MODE
  ? {
      reset: "",
      bold: "",
      dim: "",
      black: "",
      red: "",
      green: "",
      yellow: "",
      blue: "",
      magenta: "",
      cyan: "",
      white: "",
      gray: "",
      bgBlack: "",
      bgRed: "",
      bgGreen: "",
      bgYellow: "",
      bgBlue: "",
      bgMagenta: "",
      bgCyan: "",
      bgWhite: "",
    }
  : {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
      bgBlack: "\x1b[40m",
      bgRed: "\x1b[41m",
      bgGreen: "\x1b[42m",
      bgYellow: "\x1b[43m",
      bgBlue: "\x1b[44m",
      bgMagenta: "\x1b[45m",
      bgCyan: "\x1b[46m",
      bgWhite: "\x1b[47m",
    };

const S = {
  BAR: "│",
  BAR_START: "┌",
  BAR_END: "└",
  BAR_H: "─",
  STEP: "◇",
  SUCCESS: "●",
  ERROR: "●",
  WARN: "●",
  INFO: "●",
  SKIP: "○",
};

// 标准缩进配置（统一管理所有缩进宽度）
const INDENT = {
  // L1 主步骤层
  L1_CONTENT: 2,              // │ 之后空格数
  
  // L2 子步骤层
  L2_PREFIX: 2,               // │ 之后到 ├─ 的空格数
  
  // L3 详情层
  L3_PREFIX: 2,               // │ 之后空格数
  L3_CONTENT: 3,              // 第二个 │ 之后空格数
  
  // 流式输出（AI）
  STREAM_BASE: 4,             // 基础缩进
  STREAM_LIST: 6,             // 列表项缩进
};

function getIndent(level) {
  return " ".repeat(level);
}

function colorize(text, color) {
  const code = colors[color] || colors.reset;
  return `${code}${text}${colors.reset}`;
}

const printQueue = [];
let isPrinting = false;
const PRINT_DELAY = 100;

async function processQueue() {
  if (isPrinting || printQueue.length === 0) return;
  isPrinting = true;
  while (printQueue.length > 0) {
    const msg = printQueue.shift();
    console.log(msg);
    if (printQueue.length > 0) {
      await new Promise((r) => setTimeout(r, PRINT_DELAY));
    }
  }
  isPrinting = false;
}

function out(message) {
  printQueue.push(message);
  processQueue();
}

function blank() {
  out("");
}

function barPrefix() {
  return `${colors.gray}${S.BAR}${colors.reset}`;
}

function kv(key, value) {
  out(`${barPrefix()}  ${colors.dim}${key}${colors.reset}  ${value}`);
}

function flushStream() {
  return new Promise((resolve) => {
    const check = () => {
      if (printQueue.length === 0 && !isPrinting) resolve();
      else setTimeout(check, 10);
    };
    check();
  });
}

function log(message, color = "reset") {
  out(colorize(message, color));
}

function step(title) {
  out("");
  out(
    `${colors.cyan}${S.STEP}${colors.reset} ${colors.bold}${title}${colors.reset}`,
  );
}

function success(message) {
  out(`${colors.green}${S.SUCCESS}${colors.reset} ${message}`);
}

function error(message) {
  out(`${colors.red}${S.ERROR}${colors.reset} ${message}`);
}

function warn(message) {
  out(`${colors.yellow}${S.WARN}${colors.reset} ${message}`);
}

function info(message) {
  out(`${colors.blue}${S.INFO}${colors.reset} ${message}`);
}

function skip(message) {
  out(
    `${colors.gray}${S.SKIP}${colors.reset} ${colors.gray}${message}${colors.reset}`,
  );
}

function indent(message, level = 1) {
  if (message == null) return;
  
  // 纯空格缩进，匹配 clack 风格
  const spaces = "  ".repeat(level);
  out(`${spaces}${message}`);
}

function separator(char = "─", length = 40) {
  out(colors.gray + char.repeat(length) + colors.reset);
}

function groupStart(title) {
  out("");
  out(
    `${colors.gray}${S.BAR_START}${colors.reset} ${colors.bold}${title}${colors.reset}`,
  );
}

function groupEnd() {
  out(`${colors.gray}${S.BAR_END}${colors.reset}`);
}

// ============================================
// 嵌套输出函数（用于 nested 模式）
// ============================================

function nestedStep(title) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}├─${colors.reset} ${colors.bold}${title}${colors.reset}`,
  );
}

function nestedContent(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}│${colors.reset}   ${colors.dim}${message}${colors.reset}`,
  );
}

function nestedSuccess(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}│${colors.reset}   ${colors.green}${S.SUCCESS}${colors.reset} ${message}`,
  );
}

function nestedWarn(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}│${colors.reset}   ${colors.yellow}${S.WARN}${colors.reset} ${message}`,
  );
}

function nestedError(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}│${colors.reset}   ${colors.red}${S.ERROR}${colors.reset} ${message}`,
  );
}

function nestedKv(key, value) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(
    `${bar}  ${colors.gray}│${colors.reset}   ${colors.dim}${key}${colors.reset}  ${value}`,
  );
}

function nestedFinal(message, type = "success") {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  const icon =
    type === "success"
      ? `${colors.green}${S.SUCCESS}${colors.reset}`
      : type === "warn"
        ? `${colors.yellow}${S.WARN}${colors.reset}`
        : `${colors.red}${S.ERROR}${colors.reset}`;
  out(`${bar}  ${colors.gray}└─${colors.reset} ${icon} ${message}`);
}

// ============================================
// L1/L2/L3 三层格式输出函数（统一格式）
// ============================================

// L1: 主内容层（│ + 2 空格）
function l1(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${message}`);
}

// L2: 子步骤层（│ + 2 空格 + ├─）
function l2Step(title) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}├─${colors.reset} ${colors.bold}${title}${colors.reset}`);
}

// L3: 详情层（│ + 2 空格 + │ + 3 空格 + ●）
function l3Success(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}│${colors.reset}   ${colors.green}${S.SUCCESS}${colors.reset} ${message}`);
}

function l3Warn(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}│${colors.reset}   ${colors.yellow}${S.WARN}${colors.reset} ${message}`);
}

function l3Error(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}│${colors.reset}   ${colors.red}${S.ERROR}${colors.reset} ${message}`);
}

function l3Info(message) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}│${colors.reset}   ${colors.dim}${message}${colors.reset}`);
}

function l3Kv(key, value) {
  const bar = `${colors.gray}${S.BAR}${colors.reset}`;
  out(`${bar}  ${colors.gray}│${colors.reset}   ${colors.dim}${key}${colors.reset}  ${value}`);
}

const coloredLog = {
  reset: (msg) => log(msg, "reset"),
  black: (msg) => log(msg, "black"),
  red: (msg) => log(msg, "red"),
  green: (msg) => log(msg, "green"),
  yellow: (msg) => log(msg, "yellow"),
  blue: (msg) => log(msg, "blue"),
  magenta: (msg) => log(msg, "magenta"),
  cyan: (msg) => log(msg, "cyan"),
  white: (msg) => log(msg, "white"),
  gray: (msg) => log(msg, "gray"),
};

// ============================================
// Knight Rider 扫描动画算法（移植自 OpenCode）
// ============================================

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgb(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function deriveTrailColors(brightColor, steps = 6) {
  const base = hexToRgb(brightColor);
  const trailColors = [];

  for (let i = 0; i < steps; i++) {
    let alpha, brightnessFactor;

    if (i === 0) {
      alpha = 1.0;
      brightnessFactor = 1.0;
    } else if (i === 1) {
      alpha = 0.9;
      brightnessFactor = 1.15;
    } else {
      alpha = Math.pow(0.65, i - 1);
      brightnessFactor = 1.0;
    }

    trailColors.push({
      r: Math.min(255, Math.round(base.r * brightnessFactor)),
      g: Math.min(255, Math.round(base.g * brightnessFactor)),
      b: Math.min(255, Math.round(base.b * brightnessFactor)),
      a: alpha,
    });
  }

  return trailColors;
}

function deriveInactiveColor(brightColor, factor = 0.6) {
  const base = hexToRgb(brightColor);
  return {
    r: base.r,
    g: base.g,
    b: base.b,
    a: factor,
  };
}

function getScannerState(frameIndex, totalChars, options) {
  const { holdStart = 30, holdEnd = 9 } = options;

  const forwardFrames = totalChars;
  const holdEndFrames = holdEnd;
  const backwardFrames = totalChars - 1;

  if (frameIndex < forwardFrames) {
    return {
      activePosition: frameIndex,
      isHolding: false,
      holdProgress: 0,
      holdTotal: 0,
      movementProgress: frameIndex,
      movementTotal: forwardFrames,
      isMovingForward: true,
    };
  } else if (frameIndex < forwardFrames + holdEndFrames) {
    return {
      activePosition: totalChars - 1,
      isHolding: true,
      holdProgress: frameIndex - forwardFrames,
      holdTotal: holdEndFrames,
      movementProgress: 0,
      movementTotal: 0,
      isMovingForward: true,
    };
  } else if (frameIndex < forwardFrames + holdEndFrames + backwardFrames) {
    const backwardIndex = frameIndex - forwardFrames - holdEndFrames;
    return {
      activePosition: totalChars - 2 - backwardIndex,
      isHolding: false,
      holdProgress: 0,
      holdTotal: 0,
      movementProgress: backwardIndex,
      movementTotal: backwardFrames,
      isMovingForward: false,
    };
  } else {
    return {
      activePosition: 0,
      isHolding: true,
      holdProgress: frameIndex - forwardFrames - holdEndFrames - backwardFrames,
      holdTotal: holdStart,
      movementProgress: 0,
      movementTotal: 0,
      isMovingForward: false,
    };
  }
}

function calculateColorIndex(charIndex, trailLength, state) {
  const { activePosition, isHolding, holdProgress, isMovingForward } = state;

  const directionalDistance = isMovingForward
    ? activePosition - charIndex
    : charIndex - activePosition;

  if (isHolding) {
    return directionalDistance + holdProgress;
  }

  if (directionalDistance > 0 && directionalDistance < trailLength) {
    return directionalDistance;
  }

  if (directionalDistance === 0) {
    return 0;
  }

  return -1;
}

function applyAlpha(color) {
  return {
    r: Math.round(color.r * color.a),
    g: Math.round(color.g * color.a),
    b: Math.round(color.b * color.a),
  };
}

const knightRiderConfig = {
  width: 14,
  holdStart: 30,
  holdEnd: 9,
  trailSteps: 6,
  color: "#ff4fd8",
  inactiveFactor: 0.6,
  minAlpha: 0.3,
  enableFading: true,
  activeChar: "■",
  inactiveChar: "⬝",
};

// ============================================
// Spinner 主题定义
// ============================================

const spinnerThemes = {
  opencode: {
    frames: null,
    success: "██████████████",
    fail: "░░░░░░░░░░░░░░",
  },
  gradient: {
    frames: null,
    success: "████",
    fail: "░░░░",
  },
  cat: {
    frames: [
      "🐱      ",
      " 🐱     ",
      "  🐱    ",
      "   🐱   ",
      "    🐱  ",
      "     🐱 ",
      "      🐱",
      "     🐱 ",
      "    🐱  ",
      "   🐱   ",
      "  🐱    ",
      " 🐱     ",
    ],
    success: "🐱✨ 喜喵~",
    fail: "😿 喔喔...",
  },
  rocket: {
    frames: [
      "🚀      ",
      " 🚀     ",
      "  🚀    ",
      "   🚀   ",
      "    🚀  ",
      "     🚀 ",
      "      🚀",
    ],
    success: "🌟 发射成功!",
    fail: "💥 发射失败",
  },
  stars: {
    frames: [
      "✨      ",
      "✨✨     ",
      "✨✨✨    ",
      "✨✨✨✨   ",
      "✨✨✨✨✨  ",
      "✨✨✨✨✨✨ ",
      "✨✨✨✨✨✨✨",
    ],
    success: "🌟 完美!",
    fail: "💫 失败了",
  },
  loading: {
    frames: [
      "░░░░░░░",
      "▓░░░░░░",
      "▓▓░░░░░",
      "▓▓▓░░░░",
      "▓▓▓▓░░░",
      "▓▓▓▓▓░░",
      "▓▓▓▓▓▓░",
      "▓▓▓▓▓▓▓",
    ],
    success: "███████ 完成!",
    fail: "░░░░░░░ 失败",
  },
  bunny: {
    frames: [
      "🐰      🥕",
      " 🐰     🥕",
      "  🐰    🥕",
      "   🐰   🥕",
      "    🐰  🥕",
      "     🐰 🥕",
      "      🐰🥕",
    ],
    success: "🐰🥕 吃到萝卜啦~",
    fail: "🐰💨 萝卜跑了...",
  },
};

class Spinner {
  constructor(text = "加载中", theme = "opencode") {
    this.text = text;
    this.themeName = theme;
    this.theme = spinnerThemes[theme] || spinnerThemes.opencode;
    this.current = 0;
    this.timer = null;
    this.barLength = 4;

    this.kr = knightRiderConfig;
    this.krTrailColors = deriveTrailColors(this.kr.color, this.kr.trailSteps);
    this.krInactiveColor = deriveInactiveColor(
      this.kr.color,
      this.kr.inactiveFactor,
    );
    this.krTotalFrames =
      this.kr.width + this.kr.holdEnd + (this.kr.width - 1) + this.kr.holdStart;
  }

  _renderKnightRiderBar(frameIndex) {
    const state = getScannerState(frameIndex, this.kr.width, {
      holdStart: this.kr.holdStart,
      holdEnd: this.kr.holdEnd,
    });

    let fadeFactor = 1.0;
    if (this.kr.enableFading) {
      if (state.isHolding && state.holdTotal > 0) {
        const progress = state.holdProgress / state.holdTotal;
        fadeFactor = Math.max(
          this.kr.minAlpha,
          1 - progress * (1 - this.kr.minAlpha),
        );
      } else if (!state.isHolding && state.movementTotal > 0) {
        const progress = state.movementProgress / state.movementTotal;
        fadeFactor = this.kr.minAlpha + progress * (1 - this.kr.minAlpha);
      }
    }

    let bar = "";
    for (let i = 0; i < this.kr.width; i++) {
      const colorIdx = calculateColorIndex(i, this.kr.trailSteps, state);

      let charColor;
      let char;

      if (colorIdx >= 0 && colorIdx < this.krTrailColors.length) {
        const trailColor = applyAlpha(this.krTrailColors[colorIdx]);
        charColor = rgb(trailColor.r, trailColor.g, trailColor.b);
        char = this.kr.activeChar;
      } else {
        const baseAlpha = this.kr.inactiveFactor * fadeFactor;
        const inactiveColor = {
          r: this.krInactiveColor.r,
          g: this.krInactiveColor.g,
          b: this.krInactiveColor.b,
          a: baseAlpha,
        };
        const inactiveApplied = applyAlpha(inactiveColor);
        charColor = rgb(
          inactiveApplied.r,
          inactiveApplied.g,
          inactiveApplied.b,
        );
        char = this.kr.inactiveChar;
      }

      bar += `${charColor}${char}${colors.reset}`;
    }
    return bar;
  }

  _renderGradientBar(position) {
    const gradientColors = [
      "\x1b[38;5;205m",
      "\x1b[38;5;206m",
      "\x1b[38;5;207m",
      "\x1b[38;5;177m",
    ];
    const empty = `${colors.gray}·${colors.reset}`;
    const filled = gradientColors.map((c) => `${c}█${colors.reset}`);

    let bar = "";
    for (let i = 0; i < this.barLength; i++) {
      if (i < position) {
        bar += filled[i % filled.length];
      } else {
        bar += empty;
      }
    }
    return bar;
  }

  start(text) {
    if (text) this.text = text;
    this.current = 0;
    this.isStopped = false;

    if (!process.stdout.isTTY) {
      out(`  ${this.text}...`);
      return this;
    }

    if (this.themeName === "opencode") {
      this.timer = setInterval(() => {
        if (this.isStopped) return;
        const bar = this._renderKnightRiderBar(this.current);
        process.stdout.write(
          `\r  ${colors.dim}${this.text}${colors.reset} ${bar}   `,
        );
        this.current = (this.current + 1) % this.krTotalFrames;
      }, 40);
    } else if (this.themeName === "gradient") {
      this.timer = setInterval(() => {
        if (this.isStopped) return;
        const bar = this._renderGradientBar(this.current + 1);
        process.stdout.write(
          `\r  ${colors.dim}${this.text}${colors.reset} ${bar}   `,
        );
        this.current = (this.current + 1) % (this.barLength + 1);
      }, 150);
    } else {
      this.timer = setInterval(() => {
        if (this.isStopped) return;
        const frame = this.theme.frames[this.current];
        process.stdout.write(
          `\r  ${colors.dim}${this.text}${colors.reset} ${colors.cyan}${frame}${colors.reset}   `,
        );
        this.current = (this.current + 1) % this.theme.frames.length;
      }, 120);
    }
    return this;
  }

  update(text) {
    this.text = text;
    return this;
  }

  stop(finalText, isSuccess = true) {
    this.isStopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (!process.stdout.isTTY) {
      if (finalText) {
        const icon = isSuccess ? "✓" : "✗";
        const iconColor = isSuccess ? colors.green : colors.red;
        out(`  ${iconColor}${icon}${colors.reset} ${finalText}`);
      }
      return this;
    }

    // 如果没有 finalText，完全清除 spinner
    if (!finalText) {
      process.stdout.write("\r\x1b[K");
      return this;
    }

    if (this.themeName === "opencode") {
      const brightBase = hexToRgb(this.kr.color);
      const successBar = Array(this.kr.width)
        .fill(
          `${rgb(brightBase.r, brightBase.g, brightBase.b)}${this.kr.activeChar}${colors.reset}`,
        )
        .join("");
      const failBar = Array(this.kr.width)
        .fill(`${colors.red}░${colors.reset}`)
        .join("");
      const bar = isSuccess ? successBar : failBar;
      const icon = isSuccess
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      const textColor = isSuccess ? colors.reset : colors.red;
      // 完成后不显示进度条，用 \x1b[K 清除行尾残留
      process.stdout.write(
        `\r  ${icon} ${textColor}${finalText}${colors.reset}\x1b[K\n`,
      );
    } else if (this.themeName === "gradient") {
      const textColor = isSuccess ? colors.reset : colors.red;
      const icon = isSuccess
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      // 完成后不显示进度条，用 \x1b[K 清除行尾残留
      process.stdout.write(
        `\r  ${icon} ${textColor}${finalText}${colors.reset}\x1b[K\n`,
      );
    } else {
      const msg = isSuccess ? this.theme.success : this.theme.fail;
      const color = isSuccess ? colors.green : colors.red;
      // 用 \x1b[K 清除行尾残留
      process.stdout.write(
        `\r  ${finalText} ${color}${msg}${colors.reset}\x1b[K\n`,
      );
    }
    return this;
  }

  fail(text) {
    return this.stop(text, false);
  }

  success(text) {
    return this.stop(text, true);
  }

  warn(text) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const bar = `${colors.gray}${S.BAR}${colors.reset}`;
    if (process.stdout.isTTY) {
      process.stdout.write(
        `\r${bar}${colors.yellow}${S.WARN}${colors.reset} ${text}\x1b[K\n`,
      );
    } else {
      out(`${bar}${colors.yellow}${S.WARN}${colors.reset} ${text}`);
    }
    return this;
  }

  error(text) {
    return this.stop(text, false);
  }

  clear() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (process.stdout.isTTY) {
      process.stdout.write("\r\x1b[K");
    }
    return this;
  }
}

function createSpinner(text, theme = "opencode") {
  return new Spinner(text, theme);
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function isFullWidth(code) {
  if (Number.isNaN(code)) return false;
  return (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x1f680 && code <= 0x1f6ff) ||
      (code >= 0x1f900 && code <= 0x1f9ff) ||
      (code >= 0x20000 && code <= 0x2fffd) ||
      (code >= 0x30000 && code <= 0x3fffd))
  );
}

function isCombining(code) {
  if (Number.isNaN(code)) return false;
  return (
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0xfe00 && code <= 0xfe0f) ||
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0x200b && code <= 0x200f)
  );
}

function displayWidth(str) {
  const stripped = stripAnsi(str);
  let width = 0;
  for (const char of stripped) {
    const code = char.codePointAt(0);
    if (code == null) continue;
    if (isCombining(code)) continue;
    width += isFullWidth(code) ? 2 : 1;
  }
  return width;
}

function padLabel(label, targetWidth) {
  const padChar = " ";
  const w = displayWidth(label);
  if (w >= targetWidth) return label;
  return label + padChar.repeat(targetWidth - w);
}

function statusBadge(status) {
  switch (status) {
    case "success":
      return `${colors.green}${S.SUCCESS}${colors.reset}`;
    case "error":
      return `${colors.red}${S.ERROR}${colors.reset}`;
    case "warn":
      return `${colors.yellow}${S.WARN}${colors.reset}`;
    case "info":
      return `${colors.blue}${S.INFO}${colors.reset}`;
    case "skip":
      return `${colors.gray}${S.SKIP}${colors.reset}`;
    default:
      return `${colors.gray}${S.SKIP}${colors.reset}`;
  }
}

/**
 * 创建输出助手（根据 nested 模式返回对应函数）
 * 用于减少 apply.js/verify.js 等文件中的重复代码
 */
function createOutputHelper(nested = false) {
  return {
    step: nested ? nestedStep : step,
    success: nested ? nestedSuccess : success,
    warn: nested ? nestedWarn : warn,
    error: nested ? nestedError : error,
    content: nested ? nestedContent : indent,
    kv: nested ? nestedKv : kv,
    final: nested ? nestedFinal : success,
  };
}

/**
 * 统一的确认对话框（TTY 用 clack，非 TTY 回退 readline）
 */
async function confirmAction(message) {
  const p = require("@clack/prompts");
  const readline = require("readline");

  if (!process.stdout.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question(`${message} (y/n): `, (answer) => {
        rl.close();
        const ans = answer.toLowerCase().trim();
        resolve(ans === "y" || ans === "yes");
      });
    });
  }
  const answer = await p.confirm({ message, initialValue: false });
  if (p.isCancel(answer)) {
    p.cancel("已取消");
    return null;
  }
  return answer;
}

module.exports = {
  colors,
  isPlainMode: () => PLAIN_MODE,
  colorize,
  log,
  separator,
  blank,
  step,
  success,
  error,
  warn,
  info,
  skip,
  indent,
  groupStart,
  groupEnd,
  padLabel,
  kv,
  barPrefix,
  statusBadge,
  nestedStep,
  nestedContent,
  nestedSuccess,
  nestedWarn,
  nestedError,
  nestedKv,
  nestedFinal,
  l1,
  l2Step,
  l3Success,
  l3Warn,
  l3Error,
  l3Info,
  l3Kv,
  createSpinner,
  Spinner,
  S,
  INDENT,
  getIndent,
  out,
  flushStream,
  stripAnsi,
  displayWidth,
  createOutputHelper,
  confirmAction,
  ...coloredLog,
};

/**
 * 统一的颜色输出模块
 * 跨平台兼容，使用 ANSI 颜色码
 */

const colors = {
  // 基础颜色
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
};

/**
 * 带颜色的输出函数
 */
function colorize(text, color) {
  const code = colors[color] || colors.reset;
  return `${code}${text}${colors.reset}`;
}

/**
 * 打印带颜色的消息
 */
function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

/**
 * 打印分隔线
 */
function separator(char = '=', length = 40) {
  console.log(char.repeat(length));
}

/**
 * 打印步骤标题
 */
function step(title) {
  console.log('');
  separator('=', 40);
  log(`  ${title}`, 'cyan');
  separator('=', 40);
}

/**
 * 打印成功消息
 */
function success(message) {
  log(`✓ ${message}`, 'green');
}

/**
 * 打印错误消息
 */
function error(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * 打印警告消息
 */
function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * 打印信息消息
 */
function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * 打印跳过消息
 */
function skip(message) {
  log(`⊘ ${message}`, 'gray');
}

/**
 * 打印子项（带缩进）
 */
function indent(message, level = 1) {
  const prefix = '  '.repeat(level);
  console.log(`${prefix}${message}`);
}

/**
 * 创建带颜色的输出函数绑定
 */
const coloredLog = {
  reset: (msg) => log(msg, 'reset'),
  black: (msg) => log(msg, 'black'),
  red: (msg) => log(msg, 'red'),
  green: (msg) => log(msg, 'green'),
  yellow: (msg) => log(msg, 'yellow'),
  blue: (msg) => log(msg, 'blue'),
  magenta: (msg) => log(msg, 'magenta'),
  cyan: (msg) => log(msg, 'cyan'),
  white: (msg) => log(msg, 'white'),
  gray: (msg) => log(msg, 'gray'),
};

module.exports = {
  colors,
  colorize,
  log,
  separator,
  step,
  success,
  error,
  warn,
  info,
  skip,
  indent,
  ...coloredLog,
};

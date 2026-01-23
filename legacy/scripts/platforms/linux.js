/**
 * Linux 平台特定实现
 */

const { exec, ensureDir } = require('../core/utils.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 获取 bin 目录
 */
function getBinDir() {
  // 优先使用 ~/.local/bin
  const localBin = path.join(os.homedir(), '.local', 'bin');
  return localBin;
}

/**
 * 确保bin目录在PATH中
 */
function ensureBinInPath() {
  const binDir = getBinDir();
  const bashrc = path.join(os.homedir(), '.bashrc');
  const zshrc = path.join(os.homedir(), '.zshrc');
  const pathLine = `export PATH="$PATH:${binDir}"`;

  [bashrc, zshrc].forEach((rcFile) => {
    if (fs.existsSync(rcFile)) {
      const content = fs.readFileSync(rcFile, 'utf-8');
      if (!content.includes(binDir)) {
        fs.appendFileSync(rcFile, `\n# OpenCode npm\n${pathLine}\n`);
      }
    }
  });
}

/**
 * 检查是否在 PATH 中
 */
function isInPath(dirPath) {
  try {
    const pathEnv = process.env.PATH || '';
    return pathEnv.split(':').includes(dirPath);
  } catch (e) {
    return false;
  }
}

/**
 * 创建桌面快捷方式
 */
function createDesktopShortcut(execPath, options = {}) {
  const { name = 'OpenCode' } = options;
  const desktopDir = path.join(os.homedir(), 'Desktop');
  const shortcutPath = path.join(desktopDir, `${name}.desktop`);

  const content = `[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
Comment=OpenCode Chinese Edition
Exec=${execPath}
Icon=${execPath}
Terminal=false
Categories=Development;IDE;
`;

  if (fs.existsSync(desktopDir)) {
    fs.writeFileSync(shortcutPath, content, { mode: 0o644 });
    return shortcutPath;
  }

  return null;
}

module.exports = {
  getBinDir,
  ensureBinInPath,
  isInPath,
  createDesktopShortcut,
};

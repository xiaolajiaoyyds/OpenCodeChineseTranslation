/**
 * macOS 平台特定实现
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
  const zshrc = path.join(os.homedir(), '.zshrc');
  const bashrc = path.join(os.homedir(), '.bash_profile');
  const pathLine = `export PATH="$PATH:${binDir}"`;

  // macOS 默认使用 zsh
  [zshrc, bashrc].forEach((rcFile) => {
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
 * 检查是否为 Apple Silicon
 */
function isAppleSilicon() {
  return process.arch === 'arm64';
}

/**
 * 获取 Home 目录
 */
function getHomeApplicationsDir() {
  return path.join(os.homedir(), 'Applications');
}

/**
 * 创建应用程序包
 */
function createAppBundle(execPath, options = {}) {
  const { name = 'OpenCode' } = options;

  const appPath = path.join(getHomeApplicationsDir(), `${name}.app`);
  const contentsDir = path.join(appPath, 'Contents');
  const macosDir = path.join(contentsDir, 'MacOS');
  const resourcesDir = path.join(contentsDir, 'Resources');

  ensureDir(macosDir);
  ensureDir(resourcesDir);

  // 创建 Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>opencode</string>
    <key>CFBundleName</key>
    <string>${name}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>`;

  fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist);

  // 复制可执行文件
  fs.copyFileSync(execPath, path.join(macosDir, 'opencode'));
  fs.chmodSync(path.join(macosDir, 'opencode'), 0o755);

  return appPath;
}

module.exports = {
  getBinDir,
  ensureBinInPath,
  isInPath,
  isAppleSilicon,
  getHomeApplicationsDir,
  createAppBundle,
};

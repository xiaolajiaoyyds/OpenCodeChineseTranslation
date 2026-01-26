/**
 * 平台通用模块
 * 提供跨平台的通用功能
 */

const { getPlatform } = require('../core/utils.js');

/**
 * 平台检测
 */
function detectPlatform() {
  return getPlatform();
}

/**
 * 获取平台特定的构建参数
 */
function getBuildArgs() {
  const { platform, arch } = getPlatform();

  const platformMap = {
    win32: {
      platform: arch === "arm64" ? "windows-arm64" : "windows-x64",
      target: arch === "arm64" ? "win32-arm64" : "win32-x64",
      ext: '.exe',
    },
    darwin: {
      platform: `darwin-${arch}`,
      target: `darwin-${arch}`,
      ext: '',
    },
    linux: {
      platform: `linux-${arch}`,
      target: `linux-${arch}`,
      ext: '',
    },
  };

  return platformMap[platform] || platformMap.linux;
}

/**
 * 获取平台特定的全局安装路径
 */
function getGlobalInstallPath() {
  const { isWindows } = getPlatform();
  const path = require('path');

  if (isWindows) {
    // Windows: npm 全局目录
    return path.join(process.env.APPDATA || '', 'npm');
  }

  // Unix: ~/.local/bin
  return path.join(require('os').homedir(), '.local', 'bin');
}

/**
 * 创建全局命令包装器
 */
function createGlobalWrapper(name, targetPath, installDir) {
  const { isWindows } = getPlatform();
  const fs = require('fs');
  const path = require('path');

  if (isWindows) {
    // Windows: 创建 .cmd 文件
    const cmdPath = path.join(installDir, `${name}.cmd`);
    const content = `@echo off\r\nnode "%~dp0\\..\\${targetPath}" %*\r\n`;
    fs.writeFileSync(cmdPath, content);
    return cmdPath;
  }

  // Unix: 创建符号链接或包装脚本
  const binPath = path.join(installDir, name);

  // 尝试创建符号链接
  try {
    fs.unlinkSync(binPath); // 删除已存在的
  } catch (e) {
    // 忽略
  }

  try {
    fs.symlinkSync(targetPath, binPath);
    fs.chmodSync(binPath, '755');
    return binPath;
  } catch (e) {
    // 符号链接失败，创建包装脚本
    const content = `#!/bin/sh\nexec node "${targetPath}" "$@"\n`;
    fs.writeFileSync(binPath, content, { mode: 0o755 });
    return binPath;
  }
}

module.exports = {
  detectPlatform,
  getBuildArgs,
  getGlobalInstallPath,
  createGlobalWrapper,
};

/**
 * 环境检查模块
 *
 * 检查 Node.js、Bun、Git 等必需工具
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 检查命令是否存在
 */
function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查 Node.js 版本
 */
function checkNode() {
  if (!hasCommand('node')) {
    return { ok: false, error: 'Node.js 未安装' };
  }

  try {
    const version = execSync('node --version', { encoding: 'utf-8' }).trim();
    const match = version.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      if (major < 18) {
        return { ok: false, error: `Node.js 版本过低 (${version})，需要 >= 18.0.0` };
      }
    }
    return { ok: true, version };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 检查 Bun
 */
function checkBun() {
  if (!hasCommand('bun')) {
    return { ok: false, error: 'Bun 未安装（可选，推荐用于编译）' };
  }

  try {
    const version = execSync('bun --version', { encoding: 'utf-8' }).trim();
    return { ok: true, version };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 检查 Git
 */
function checkGit() {
  if (!hasCommand('git')) {
    return { ok: false, error: 'Git 未安装' };
  }

  try {
    execSync('git --version', { stdio: 'ignore' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 检查项目目录
 */
function checkProjectDir() {
  // 获取项目根目录（从当前位置向上查找）
  let dir = process.cwd();
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'opencode-i18n'))) {
      return { ok: true, dir };
    }
    dir = path.dirname(dir);
  }

  return { ok: false, error: '未找到 opencode-i18n 目录' };
}

/**
 * 综合环境检查
 */
async function check() {
  const errors = [];
  const warnings = [];

  // 检查 Node.js
  const node = checkNode();
  if (!node.ok) {
    errors.push(node.error);
  }

  // 检查 Bun（可选）
  const bun = checkBun();
  if (!bun.ok) {
    warnings.push(bun.error);
  }

  // 检查 Git
  const git = checkGit();
  if (!git.ok) {
    errors.push(git.error);
  }

  // 检查项目目录
  const project = checkProjectDir();
  if (!project.ok) {
    errors.push(project.error);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    node: node.ok ? node.version : null,
    bun: bun.ok ? bun.version : null,
    projectDir: project.ok ? project.dir : null
  };
}

module.exports = { hasCommand, checkNode, checkBun, checkGit, checkProjectDir, check };

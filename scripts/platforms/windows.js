/**
 * Windows 平台特定实现
 */

const { exec } = require('../core/utils.js');

/**
 * 获取 PowerShell 路径
 */
function getPowershellPath() {
  // 优先使用 PowerShell 7 (pwsh)
  const possiblePaths = [
    process.env.PWSH_EXE, // 环境变量指定的 pwsh
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
    'powershell.exe', // Windows PowerShell 5
  ];

  for (const pwshPath of possiblePaths) {
    if (pwshPath && require('fs').existsSync(pwshPath)) {
      return pwshPath;
    }
  }

  return 'powershell.exe';
}

/**
 * 执行 PowerShell 命令
 */
function execPowershell(command, options = {}) {
  const psPath = getPowershellPath();
  const psCommand = `-NoProfile -ExecutionPolicy Bypass -Command "${command}"`;

  return exec(`"${psPath}" ${psCommand}`, options);
}

/**
 * 添加到 PATH 环境变量
 */
function addToPath(dirPath, scope = 'user') {
  const pathKey = scope === 'system' ? 'Path' : 'Path';
  // 需要管理员权限修改系统 PATH
  execPowershell(`
    $path = [Environment]::GetEnvironmentVariable('${pathKey}', '${scope === 'system' ? 'Machine' : 'User'}')
    if ($path -notlike "*${dirPath}*") {
      [Environment]::SetEnvironmentVariable('${pathKey}', "$path;${dirPath}", '${scope === 'system' ? 'Machine' : 'User'}')
    }
  `);
}

/**
 * 检查是否在 PATH 中
 */
function isInPath(dirPath) {
  const { exec: execSync } = require('child_process');
  try {
    const result = execSync(`echo %Path%`, { encoding: 'utf-8' });
    return result.includes(dirPath);
  } catch (e) {
    return false;
  }
}

module.exports = {
  getPowershellPath,
  execPowershell,
  addToPath,
  isInPath,
};

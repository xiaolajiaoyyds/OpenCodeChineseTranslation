/**
 * build 命令
 * 编译构建 OpenCode
 */

const Builder = require('../core/build.js');
const { getPlatform } = require('../core/utils.js');

async function run(options = {}) {
  const { platform = null, deploy = true } = options;
  const builder = new Builder();

  // 确定构建平台
  let targetPlatform = platform;
  if (!targetPlatform) {
    const { platform: currentPlatform } = getPlatform();
    const platformMap = {
      win32: 'windows-x64',
      darwin: 'darwin-arm64',
      linux: 'linux-x64',
    };
    targetPlatform = platformMap[currentPlatform] || 'windows-x64';
  }

  // 执行构建
  const result = await builder.build({
    platform: targetPlatform,
    silent: options.silent,
  });

  if (!result) {
    return false;
  }

  // 部署到本地
  if (deploy) {
    await builder.deployToLocal({
      platform: targetPlatform,
      silent: options.silent,
    });
  }

  return true;
}

module.exports = { run };

/**
 * build 命令
 * 编译构建 OpenCode (macOS ARM64)
 */

const Builder = require('../core/build.js');

async function run(options = {}) {
  const { deploy = true } = options;
  const builder = new Builder();

  // 执行构建
  const result = await builder.build({ silent: options.silent });
  if (!result) return false;

  // 部署到本地 bin 目录
  if (deploy) {
    await builder.deployToLocal({ silent: options.silent });
  }

  return true;
}

module.exports = { run };

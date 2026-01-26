/**
 * build 命令
 * 编译构建 OpenCode (macOS ARM64)
 */

const { runPipeline, printPipelineSummary } = require("../core/pipeline.js");

async function run(options = {}) {
  const { deploy = true } = options;
  const res = await runPipeline("build", {
    skipUpdate: true,
    skipDeploy: true,
    buildDeployToLocal: deploy,
  });
  await printPipelineSummary("build", res);
  return res.ok;
}

module.exports = { run };

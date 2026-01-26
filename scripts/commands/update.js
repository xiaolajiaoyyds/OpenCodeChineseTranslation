/**
 * update 命令
 * 更新 OpenCode 源码到最新版本
 */

const { getOpencodeDir } = require("../core/utils.js");
const { cloneRepo, pullRepo, getRepoVersion } = require("../core/git.js");
const {
  step,
  success,
  error,
  indent,
  warn,
  nestedStep,
  nestedSuccess,
  nestedContent,
} = require("../core/colors.js");

async function run(options = {}) {
  const { force = false, nested = false } = options;
  const opencodeDir = getOpencodeDir();

  const outputStep = nested ? nestedStep : step;
  const outputSuccess = nested ? nestedSuccess : success;
  const outputContent = nested ? nestedContent : indent;

  outputStep("更新 OpenCode 源码");

  // 检查是否已存在仓库
  const { isGitRepo } = require("../core/git.js");

  if (isGitRepo(opencodeDir)) {
    if (force) {
      warn("强制重新克隆");
      // 删除旧目录
      const { remove } = require("../core/utils.js");
      remove(opencodeDir);
    } else {
      const result = await pullRepo(opencodeDir, { silent: nested, nested });
      if (result && !nested) {
        // 获取版本信息
        const version = getRepoVersion(opencodeDir);
        if (version) {
          outputSuccess("源码已更新");
          outputContent(`版本: ${version.version || "未知"}`);
          outputContent(`Commit: ${version.commit || "未知"}`);
        }
      }
      return result;
    }
  }

  // 克隆新仓库
  const result = await cloneRepo(
    "https://github.com/anomalyco/opencode.git",
    opencodeDir,
    { depth: 1, silent: nested, nested },
  );

  if (result && !nested) {
    // 获取版本信息
    const version = getRepoVersion(opencodeDir);
    if (version) {
      outputSuccess("源码克隆完成");
      outputContent(`版本: ${version.version || "未知"}`);
      outputContent(`Commit: ${version.commit || "未知"}`);
    }
  }

  return result;
}

module.exports = { run };

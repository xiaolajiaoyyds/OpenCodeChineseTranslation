/**
 * full 命令
 * 完整工作流：检查源码 → 更新 → 恢复纯净 → 汉化 → 验证 → 编译 → 部署
 */

const p = require("@clack/prompts");
const color = require("picocolors");
const { error, indent, blank, isPlainMode } = require("../core/colors.js");
const { existsSync } = require("fs");
const { execSync } = require("child_process");
const { isGitRepo } = require("../core/git.js");
const { getOpencodeDir } = require("../core/utils.js");
const { runPipeline } = require("../core/pipeline.js");

function checkSourceUpdate(repoPath = getOpencodeDir()) {
  if (!existsSync(repoPath) || !isGitRepo(repoPath)) {
    return { hasUpdate: false, exists: false };
  }

  try {
    const localCommit = execSync("git rev-parse HEAD", {
      cwd: repoPath,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();

    let remoteBranch = null;
    try {
      remoteBranch = execSync(
        "git rev-parse --abbrev-ref --symbolic-full-name @{u}",
        { cwd: repoPath, stdio: "pipe", encoding: "utf-8" },
      ).trim();
    } catch {}

    if (!remoteBranch) {
      let currentBranch = "main";
      try {
        currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: repoPath,
          stdio: "pipe",
          encoding: "utf-8",
        }).trim();
      } catch {}
      if (!currentBranch || currentBranch === "HEAD") currentBranch = "main";
      remoteBranch = `origin/${currentBranch}`;
    }

    const remoteName = remoteBranch.includes("/")
      ? remoteBranch.split("/")[0]
      : "origin";

    try {
      execSync(`git fetch ${remoteName} --prune`, {
        cwd: repoPath,
        stdio: "pipe",
        encoding: "utf-8",
      });
    } catch {
      return {
        exists: true,
        hasUpdate: false,
        checkFailed: true,
        localCommit: localCommit.slice(0, 8),
      };
    }

    const remoteCommit = execSync(`git rev-parse ${remoteBranch}`, {
      cwd: repoPath,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();

    return {
      exists: true,
      hasUpdate: localCommit !== remoteCommit,
      localCommit: localCommit.slice(0, 8),
      remoteCommit: remoteCommit.slice(0, 8),
      remoteBranch,
    };
  } catch {
    return { exists: true, hasUpdate: false };
  }
}

async function run(options = {}) {
  const { auto = false } = options;

  blank();
  p.intro(
    color.bgCyan(
      color.black(isPlainMode() ? " 一键汉化全流程 " : " 🚀 一键汉化全流程 "),
    ),
  );

  let skipBuild = false;
  let skipDeploy = false;

  if (!auto) {
    const buildConfirm = await p.confirm({
      message: "是否编译 OpenCode?",
      initialValue: true,
    });
    if (p.isCancel(buildConfirm)) {
      p.cancel("已取消");
      return false;
    }
    skipBuild = !buildConfirm;

    if (!skipBuild) {
      const deployConfirm = await p.confirm({
        message: "是否部署 opencode 全局命令?",
        initialValue: true,
      });
      if (p.isCancel(deployConfirm)) {
        p.cancel("已取消");
        return false;
      }
      skipDeploy = !deployConfirm;
    } else {
      skipDeploy = true;
    }
  }

  const result = await runPipeline("oneclick", {
    skipBuild,
    skipDeploy,
    skipUpdate: false,
  });

  if (!result.ok) {
    error("流程失败");
    const failed = result.steps.find((s) => !s.ok);
    if (failed) indent(`失败步骤: ${failed.name} - ${failed.summary}`, 2);
    return false;
  }

  // 先显示覆盖率报告（在执行总结之前）
  const i18n = result.ctx.i18n;
  if (i18n) {
    blank();
    i18n.showCoverageReport();
  }

  // 获取覆盖率数据给 AI 总结用
  let uncoveredAnalysis = null;
  if (i18n) {
    const stats = i18n.getCoverageStats();
    uncoveredAnalysis = stats?.uncoveredAnalysis || null;
  }

  // 显示执行总结（包含 AI 总结）
  const { printPipelineSummary } = require("../core/pipeline.js");
  await printPipelineSummary("oneclick", result, {
    newTranslations: result.ctx.newTranslations || null,
    uncoveredAnalysis,
  });

  p.outro(color.green("✓ 汉化流程完成！"));
  return true;
}

module.exports = { run, checkSourceUpdate };

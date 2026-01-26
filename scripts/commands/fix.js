/**
 * fix 命令
 * 一键：修复语言包 → 应用到源码 → 编译
 */

const { runPipeline, confirmIfNeeded, printPipelineSummary } = require("../core/pipeline.js");
const { step, success, error, indent, blank } = require("../core/colors.js");

async function run(options = {}) {
  const {
    dryRun = false,
    skipUpdate = false,
    skipBuild = false,
    deploy = true,
  } = options;

  blank();
  step("一键修复：以官方源码为准");

  let effectiveSkipUpdate = skipUpdate;
  if (!skipUpdate && !dryRun) {
    const confirm = await confirmIfNeeded("是否更新到官方最新版本?", true);
    if (confirm === null) return false;
    effectiveSkipUpdate = !confirm;
  }

  const result = await runPipeline("repair", {
    dryRun,
    skipUpdate: effectiveSkipUpdate,
    skipBuild,
    skipDeploy: !deploy,
  });

  if (!result.ok) {
    error("流程失败");
    const failed = result.steps.find((s) => !s.ok);
    if (failed) indent(`失败步骤: ${failed.name} - ${failed.summary}`, 2);
    return false;
  }

  await printPipelineSummary("repair", result);
  const i18n = result.ctx.i18n;
  if (i18n) {
    blank();
    await i18n.showCoverageReportWithAI(result.ctx.newTranslations || null);
  }

  success(dryRun ? "dry-run 完成" : "一键修复完成");
  return true;
}

module.exports = { run };

const p = require("@clack/prompts");
const path = require("path");
const { execSync } = require("child_process");
const I18n = require("./i18n.js");
const Translator = require("./translator.js");
const Builder = require("./build.js");
const { deployCompiledBinary } = require("./deployer.js");
const updateCmd = require("../commands/update.js");
const { cleanRepo } = require("./git.js");
const { getOpencodeDir } = require("./utils.js");
const {
  step,
  success,
  warn,
  error,
  indent,
  blank,
  kv,
  colors,
  barPrefix,
  createSpinner,
  flushStream,
  groupStart,
  groupEnd,
  nestedStep,
  nestedSuccess,
  nestedWarn,
  nestedError,
  nestedKv,
  confirmAction,
  l1,
  l2Step,
  l3Success,
  l3Warn,
  l3Error,
  l3Info,
  l3Kv,
  S,
  out,
} = require("./colors.js");

function presetToSteps(preset) {
  switch (preset) {
    case "oneclick":
      return [
        "ensureSource",
        "cleanSource",
        "repairPack",
        "applyToSource",
        "qualitySource",
        "build",
        "deploy",
      ];
    case "repair":
      return [
        "ensureSourceOptional",
        "cleanSource",
        "repairPack",
        "applyToSource",
        "qualitySource",
        "build",
        "deploy",
      ];
    case "apply":
      return ["repairPack", "applyToSource", "qualitySource"];
    case "verify":
      return ["verifyPack"];
    case "packQuality":
      return ["packQuality"];
    case "build":
      return ["build"];
    case "deploy":
      return ["deploy"];
    default:
      return [];
  }
}

async function runQualitySourceCheck(i18n, outputIndent = indent) {
  const c = colors;

  await flushStream();
  blank();
  groupStart("质量检查");

  let allPassed = true;
  const issues = [];
  const results = [];

  const tsSpinner = createSpinner("检查 TypeScript 语法...");
  tsSpinner.start();
  try {
    const tscPath = path.join(i18n.opencodeDir, "node_modules", ".bin", "tsc");
    const pkgPath = path.join(i18n.opencodeDir, "packages", "opencode");

    execSync(`${tscPath} --noEmit --skipLibCheck`, {
      cwd: pkgPath,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000,
    });

    tsSpinner.stop();
    results.push({ ok: true, text: "TypeScript 语法正确" });
  } catch (e) {
    const stderr = e.stderr?.toString() || "";
    const errorLines = stderr.split("\n").filter((l) => l.includes("error TS"));

    if (errorLines.length > 0) {
      allPassed = false;
      tsSpinner.stop();
      results.push({
        ok: false,
        text: `发现 ${errorLines.length} 个 TypeScript 错误`,
      });

      const translationErrors = errorLines.filter(
        (l) => l.includes(".tsx") && (l.includes("tui") || l.includes("cli")),
      );

      if (translationErrors.length > 0) {
        translationErrors.slice(0, 3).forEach((errLine) => {
          const match = errLine.match(
            /([^/]+\.tsx)\((\d+),(\d+)\).*error TS\d+: (.+)/,
          );
          if (match) {
            issues.push({ file: match[1], line: match[2], message: match[4] });
          }
        });
      }
    } else {
      tsSpinner.stop();
      results.push({ ok: true, text: "TypeScript 语法正确" });
    }
  }

  const fileSpinner = createSpinner("检查文件完整性...");
  fileSpinner.start();
  const criticalFiles = [
    "src/cli/cmd/tui/app.tsx",
    "src/cli/cmd/tui/routes/session/index.tsx",
    "src/cli/cmd/tui/routes/session/footer.tsx",
  ];
  const fs = require("fs");
  let missingFiles = 0;
  for (const file of criticalFiles) {
    const fullPath = path.join(i18n.sourceBase, file);
    if (!fs.existsSync(fullPath)) missingFiles++;
  }
  if (missingFiles === 0) {
    fileSpinner.stop();
    results.push({ ok: true, text: "关键文件完整" });
  } else {
    fileSpinner.stop();
    results.push({ ok: false, text: `缺失 ${missingFiles} 个关键文件` });
    allPassed = false;
  }

  const formatSpinner = createSpinner("检查字符串格式...");
  formatSpinner.start();
  const configs = i18n.loadConfig();
  let unclosedCount = 0;
  for (const config of configs) {
    if (!config.replacements) continue;
    for (const [original, translated] of Object.entries(config.replacements)) {
      const originalTags = (original.match(/<[^>]+>/g) || []).length;
      const translatedTags = (translated.match(/<[^>]+>/g) || []).length;
      if (originalTags !== translatedTags) {
        unclosedCount++;
        if (unclosedCount <= 3)
          issues.push({ type: "jsx", original, translated });
      }
      const originalBraces = (original.match(/[{}]/g) || []).length;
      const translatedBraces = (translated.match(/[{}]/g) || []).length;
      if (originalBraces !== translatedBraces) {
        unclosedCount++;
        if (unclosedCount <= 3)
          issues.push({ type: "brace", original, translated });
      }
    }
  }
  if (unclosedCount === 0) {
    formatSpinner.stop();
    results.push({ ok: true, text: "字符串格式正确" });
  } else {
    formatSpinner.stop();
    results.push({ ok: "warn", text: `发现 ${unclosedCount} 个潜在问题` });
  }

  // 检查废弃翻译
  const obsoleteSpinner = createSpinner("检查废弃翻译...");
  obsoleteSpinner.start();
  const obsolete = i18n.checkObsoleteTranslations();
  if (obsolete.length > 0) {
    obsoleteSpinner.stop();

    // 询问用户是否清理废弃翻译
    const shouldClean = await confirmAction(
      `发现 ${obsolete.length} 个废弃翻译配置，是否清理？`,
    );
    if (shouldClean) {
      const removed = i18n.removeObsoleteTranslations(obsolete);
      results.push({ ok: true, text: `已清理 ${removed} 个废弃翻译配置` });
    } else {
      results.push({
        ok: "warn",
        text: `跳过清理 ${obsolete.length} 个废弃翻译文件`,
      });
    }
  } else {
    obsoleteSpinner.stop();
    results.push({ ok: true, text: "无废弃翻译文件" });
  }

  blank();
  for (const r of results) {
    if (r.ok === true) indent(`${c.green}✓${c.reset} ${r.text}`);
    else if (r.ok === "warn") indent(`${c.yellow}⚠${c.reset} ${r.text}`);
    else indent(`${c.red}✗${c.reset} ${r.text}`);
  }

  blank();
  if (allPassed && issues.length === 0) {
    success("质量检查通过");
  } else if (issues.length > 0 && allPassed) {
    warn(`发现 ${issues.length} 个潜在问题，但不影响编译`);
  } else {
    error("质量检查失败");
    indent(`建议: 运行 'opencodenpm build' 查看详细错误`, 2);
  }

  groupEnd();
  return allPassed;
}

async function runStep(ctx, name, fn) {
  const startedAt = Date.now();
  try {
    const result = (await fn(ctx)) || {};
    return {
      name,
      ok: result.ok !== false,
      changed: Boolean(result.changed),
      summary: result.summary || "",
      details: result.details || null,
      ms: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      changed: false,
      summary: e.message,
      details: null,
      ms: Date.now() - startedAt,
      error: e,
    };
  }
}

function printStepSummary(stepResult) {
  const c = colors;
  const labels = {
    ensureSource: "更新官方源码",
    ensureSourceOptional: "更新官方源码（可选）",
    cleanSource: "恢复源码纯净",
    repairPack: "修复语言包（扫描/汉化/质量/验证）",
    verifyPack: "验证语言包",
    packQuality: "语言包质量检查",
    applyToSource: "应用语言包到源码",
    qualitySource: "替换后质量检查",
    build: "构建编译",
    deployToLocal: "部署到本地",
    deploy: "部署到系统 PATH",
  };
  const label = labels[stepResult.name] || stepResult.name;
  const icon = stepResult.ok ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  const time = stepResult.ms
    ? `${c.dim}${(stepResult.ms / 1000).toFixed(1)}s${c.reset}`
    : "";

  // L2 格式：使用 l2Step 输出主步骤
  const bar = `${c.gray}${S.BAR}${c.reset}`;
  const content = `${icon} ${label}  ${c.dim}${stepResult.summary}${c.reset}  ${time}`;
  out(`${bar}  ${content}`.trimEnd());
}

async function printPipelineSummary(preset, result, options = {}) {
  const c = colors;
  blank();
  groupStart("执行总结");

  l1(`${c.cyan}流程${c.reset}: ${preset}`);
  l1(
    `${c.cyan}状态${c.reset}: ${result.ok ? c.green + "成功" + c.reset : c.red + "失败" + c.reset}`,
  );
  blank();

  let deployToLocalInfo = null;
  let deployInfo = null;

  for (const stepResult of result.steps) {
    if (stepResult.name === "deploy") {
      deployInfo = stepResult;
      continue;
    }

    printStepSummary(stepResult);
    const d = stepResult.details || {};

    if (stepResult.name === "repairPack") {
      if (d.newFiles && typeof d.newFiles.total === "number") {
        l3Info(`质量检查: 扫描 ${d.quality?.checked || 0} 条`);
        l3Info(
          `语法问题: ${d.quality?.syntaxErrors || 0}，AI 语义问题: ${d.quality?.aiIssues || 0}`,
        );
      }
    }

    if (stepResult.name === "applyToSource" && d) {
      if (typeof d.files === "number" && typeof d.replacements === "number") {
        l3Info(`替换结果: ${d.files} 个文件, ${d.replacements} 处替换`);
      }
    }

    // 提取 build 步骤中的 deployToLocal 信息
    if (stepResult.name === "build" && d && d.deployToLocal) {
      deployToLocalInfo = {
        name: "deployToLocal",
        ok: true,
        summary: "部署到本地",
        details: d.deployToLocal,
      };
    }
  }

  // 部署信息放在 groupEnd 之前
  if (deployToLocalInfo) {
    blank();
    printStepSummary(deployToLocalInfo);
    const d = deployToLocalInfo.details || {};
    if (d.target) {
      l3Info(`已部署到: ${d.target}`);
    }
    if (d.size) {
      l3Info(`大小: ${d.size}`);
    }
  }

  if (deployInfo) {
    blank();
    printStepSummary(deployInfo);
    const d = deployInfo.details || {};
    if (d.target) {
      l3Info(`已部署到: ${d.target}`);
    }
    if (d.size) {
      l3Info(`大小: ${d.size}`);
    }
  }

  // AI 总结合并到执行总结框内最后（仅当有 AI 数据时）
  const hasAIData = options.newTranslations ||
    (options.uncoveredAnalysis &&
     (options.uncoveredAnalysis.needTranslate?.length > 0 ||
      options.uncoveredAnalysis.noNeedTranslate?.length > 0));

  if (hasAIData) {
    blank();
    l1(`${c.cyan}AI 总结${c.reset}`);
    blank();
    await generateAISummaryInSummary(options);
    blank();  // AI 总结后换行，避免与 └ 混在一起
  }

  groupEnd();
}

/**
 * 在执行总结框内生成 AI 总结（不创建新框）
 */
async function generateAISummaryInSummary(options) {
  const Translator = require("./translator.js");
  const translator = new Translator();

  // 构建 AI 总结的上下文
  const summaryContext = {
    uncoveredAnalysis: options.uncoveredAnalysis || {
      needTranslate: [],
      noNeedTranslate: [],
    },
    newTranslations: options.newTranslations || null,
  };

  await translator.generateCoverageSummaryInline(summaryContext);
}

function buildSteps(options = {}) {
  const {
    dryRun = false,
    skipUpdate = false,
    skipBuild = false,
    skipDeploy = false,
    skipQualitySource = false,
    qualitySampleSize = 50,
    buildDeployToLocal = true,
    skipPackTranslate = false,
    skipPackQuality = false,
    skipPackVerify = false,
    incremental = false,
    since = null,
    fixPackQuality = false,
    aiCheckPackQuality = true,
  } = options;

  return {
    ensureSource: async () => {
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过更新" };

      const { getRepoVersion } = require("./git.js");
      const opencodeDir = getOpencodeDir();
      const spinner = createSpinner("正在更新源码...");
      spinner.start();

      const ok = await updateCmd.run({ nested: true, silent: true });

      if (ok) {
        const version = getRepoVersion(opencodeDir);
        const versionStr = version?.version ? `v${version.version}` : "";
        const commitStr = version?.commit ? `(${version.commit})` : "";
        spinner.stop(`源码已更新 ${versionStr} ${commitStr}`.trim());
        return {
          ok: true,
          changed: true,
          summary: `源码已更新 ${versionStr}`.trim(),
          details: { version: version?.version, commit: version?.commit },
        };
      } else {
        spinner.stop("源码更新失败");
        return { ok: false, changed: false, summary: "源码更新失败" };
      }
    },
    ensureSourceOptional: async () => {
      if (skipUpdate) return { ok: true, changed: false, summary: "跳过更新" };
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过更新" };

      const { getRepoVersion } = require("./git.js");
      const opencodeDir = getOpencodeDir();
      const spinner = createSpinner("正在更新源码...");
      spinner.start();

      const ok = await updateCmd.run({ nested: true, silent: true });

      if (ok) {
        const version = getRepoVersion(opencodeDir);
        const versionStr = version?.version ? `v${version.version}` : "";
        const commitStr = version?.commit ? `(${version.commit})` : "";
        spinner.stop(`源码已更新 ${versionStr} ${commitStr}`.trim());
        return {
          ok: true,
          changed: true,
          summary: `源码已更新 ${versionStr}`.trim(),
          details: { version: version?.version, commit: version?.commit },
        };
      } else {
        spinner.stop("源码更新失败");
        return { ok: false, changed: false, summary: "源码更新失败" };
      }
    },
    cleanSource: async () => {
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过清理" };
      const spinner = createSpinner("正在恢复源码纯净状态...");
      spinner.start();
      const ok = await cleanRepo(getOpencodeDir(), { silent: true });
      spinner.stop(ok ? "源码已恢复纯净" : "源码清理失败");
      return {
        ok,
        changed: ok,
        summary: ok ? "源码已恢复纯净" : "源码清理失败",
      };
    },
    repairPack: async (ctx) => {
      const i18n = ctx.i18n || new I18n();
      const translator = ctx.translator || new Translator();
      ctx.i18n = i18n;
      ctx.translator = translator;

      let newFileStats = null;
      let scanRes = null;
      let qualityRes = null;

      if (!skipPackTranslate) {
        nestedStep("语言包阶段: 扫描新增文件");
        const newFiles = i18n.detectNewFiles();
        if (newFiles.length > 0) {
          nestedKv("新增需汉化文件", `${newFiles.length} 个`);
          if (translator.checkConfig()) {
            const spinner = createSpinner("AI 分析新增文件...");
            spinner.start();
            newFileStats = await i18n.smartProcessNewFiles(newFiles, {
              silent: true,
              dryRun,
            });
            spinner.stop();
            if (newFileStats?.translatedFiles) {
              nestedSuccess(
                dryRun
                  ? `(dry-run) 将写入 ${newFileStats.translatedFiles} 个配置 / ${newFileStats.translatedEntries} 条`
                  : `已写入 ${newFileStats.translatedFiles} 个配置 / ${newFileStats.translatedEntries} 条`,
              );
            }
          } else {
            nestedWarn("未配置 OPENAI_API_KEY，跳过新增文件 AI 分析/翻译");
          }
        } else {
          nestedSuccess("没有新增需要汉化的文件");
        }
        blank();
      }

      if (!skipPackTranslate) {
        nestedStep("语言包阶段: 扫描遗漏翻译");
        if (translator.checkConfig()) {
          const spinner = createSpinner("正在扫描并翻译...");
          spinner.start();
          scanRes = incremental
            ? await translator.incrementalTranslate({
                since,
                uncommitted: true,
                dryRun,
              })
            : await translator.scanAndTranslate({ dryRun });
          spinner.stop();
          if (!scanRes.success) nestedWarn("部分翻译失败，继续后续步骤");
          ctx.newTranslations = scanRes;
        } else {
          nestedWarn("未配置 OPENAI_API_KEY，跳过遗漏翻译补齐");
        }
        blank();
      }

      if (!skipPackQuality) {
        nestedStep("语言包阶段: 质量检查与修复");
        const hasAI = translator.checkConfig();
        qualityRes = await translator.checkQuality({
          fix: hasAI,
          aiCheck: hasAI,
          fixAi: true,
          dryRun,
          sampleSize: qualitySampleSize,
        });
        if (!qualityRes.success) nestedWarn("语言包质量未完全通过");
        blank();
      }

      if (!skipPackVerify) {
        nestedStep("语言包阶段: 验证");
        const errors = i18n.validate();
        if (errors.length > 0) {
          nestedError("发现配置错误:");
          errors.forEach((e) => indent(`- ${e}`, 4));
          return {
            ok: false,
            changed: false,
            summary: "语言包验证失败",
            details: errors,
          };
        }
        nestedSuccess("语言包验证通过");
        blank();
      }

      const details = {
        newFiles: newFileStats,
        scan: scanRes?.stats
          ? {
              ...scanRes.stats,
              totalTexts: scanRes.totalTexts || 0,
            }
          : null,
        quality: qualityRes
          ? {
              checked: qualityRes.checked,
              syntaxErrors:
                qualityRes.syntaxIssues?.filter((i) => i.severity === "error")
                  .length || 0,
              aiIssues: qualityRes.aiIssues?.length || 0,
              fixed: qualityRes.fixed || 0,
            }
          : null,
      };

      return {
        ok: true,
        changed: !dryRun,
        summary: "语言包已修复并验证",
        details,
      };
    },
    verifyPack: async (ctx) => {
      const i18n = ctx.i18n || new I18n();
      ctx.i18n = i18n;
      const errors = i18n.validate();
      return {
        ok: errors.length === 0,
        changed: false,
        summary: errors.length ? "验证失败" : "验证通过",
        details: errors,
      };
    },
    packQuality: async (ctx) => {
      const translator = ctx.translator || new Translator();
      ctx.translator = translator;
      const hasAI = translator.checkConfig();
      const result = await translator.checkQuality({
        fix: fixPackQuality && hasAI,
        aiCheck: aiCheckPackQuality && hasAI,
        fixAi: fixPackQuality && hasAI,
        dryRun,
        sampleSize: qualitySampleSize,
      });
      return {
        ok: result.success,
        changed: fixPackQuality && !dryRun,
        summary: result.success ? "语言包质量检查通过" : "语言包质量检查失败",
      };
    },
    applyToSource: async (ctx) => {
      const i18n = ctx.i18n || new I18n();
      ctx.i18n = i18n;
      nestedStep("应用语言包到源码");
      const result = await i18n.apply({ silent: true, skipNewFileCheck: true });
      nestedSuccess(
        `汉化应用完成: ${result.files} 个文件, ${result.replacements}处替换`,
      );
      ctx.applyResult = result;
      blank();
      return {
        ok: true,
        changed: result.replacements > 0,
        summary: "已应用到源码",
        details: result,
      };
    },
    qualitySource: async (ctx) => {
      if (skipQualitySource)
        return { ok: true, changed: false, summary: "跳过替换后质量检查" };
      if (dryRun)
        return {
          ok: true,
          changed: false,
          summary: "dry-run 跳过替换后质量检查",
        };
      const i18n = ctx.i18n || new I18n();
      const ok = await runQualitySourceCheck(i18n, (m) => indent(m, 4));
      blank();
      return {
        ok,
        changed: false,
        summary: ok ? "替换后质量检查通过" : "替换后质量检查失败",
      };
    },
    build: async () => {
      if (skipBuild) return { ok: true, changed: false, summary: "跳过编译" };
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过编译" };

      nestedStep("编译构建");
      const builder = new Builder();
      const ok = await builder.build({ silent: false, nested: true });
      if (!ok) {
        return { ok: false, changed: false, summary: "编译失败" };
      }

      let deployToLocalResult = null;
      if (buildDeployToLocal) {
        // 静默执行，稍后在总结中显示
        const success = await builder.deployToLocal({ silent: true, nested: true });
        if (success) {
          const path = require("path");
          const fs = require("fs");
          const { getBinDir, getPlatform, formatSize } = require("./utils.js");
          const binDir = getBinDir();
          const { isWindows } = getPlatform();
          const destName = isWindows ? "opencode.exe" : "opencode";
          const destPath = path.join(binDir, destName);
          try {
            const stats = fs.statSync(destPath);
            deployToLocalResult = {
              target: destPath,
              size: formatSize(stats.size),
            };
          } catch (e) {}
        }
      }

      blank();
      return {
        ok: true,
        changed: true,
        summary: "编译完成",
        details: deployToLocalResult ? { deployToLocal: deployToLocalResult } : null
      };
    },
    deploy: async () => {
      if (skipDeploy) return { ok: true, changed: false, summary: "跳过部署" };
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过部署" };

      // 静默执行，稍后在总结中显示
      const result = await deployCompiledBinary(true);
      blank();
      if (result) {
        return {
          ok: true,
          changed: true,
          summary: "部署完成",
          details: { target: result.target, size: result.size },
        };
      }
      return {
        ok: false,
        changed: false,
        summary: "部署失败",
        details: null,
      };
    },
    qualitySource: async (ctx) => {
      if (skipQualitySource)
        return { ok: true, changed: false, summary: "跳过替换后质量检查" };
      if (dryRun)
        return {
          ok: true,
          changed: false,
          summary: "dry-run 跳过替换后质量检查",
        };
      const i18n = ctx.i18n || new I18n();
      const ok = await runQualitySourceCheck(i18n, indent);
      blank();
      return {
        ok,
        changed: false,
        summary: ok ? "替换后质量检查通过" : "替换后质量检查失败",
      };
    },
    build: async () => {
      if (skipBuild) return { ok: true, changed: false, summary: "跳过编译" };
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过编译" };

      const builder = new Builder();
      const ok = await builder.build({ silent: false, nested: false });
      if (!ok) {
        return { ok: false, changed: false, summary: "编译失败" };
      }

      let deployToLocalResult = null;
      if (buildDeployToLocal) {
        const success = await builder.deployToLocal({ silent: true });
        if (success) {
          const path = require("path");
          const fs = require("fs");
          const { getBinDir, getPlatform, formatSize } = require("./utils.js");
          const binDir = getBinDir();
          const { isWindows } = getPlatform();
          const destName = isWindows ? "opencode.exe" : "opencode";
          const destPath = path.join(binDir, destName);
          try {
            const stats = fs.statSync(destPath);
            deployToLocalResult = {
              target: destPath,
              size: formatSize(stats.size),
            };
          } catch (e) {}
        }
      }

      blank();
      return {
        ok: true,
        changed: true,
        summary: "编译完成",
        details: deployToLocalResult ? { deployToLocal: deployToLocalResult } : null
      };
    },
    deploy: async () => {
      if (skipDeploy) return { ok: true, changed: false, summary: "跳过部署" };
      if (dryRun)
        return { ok: true, changed: false, summary: "dry-run 跳过部署" };

      // 静默执行，稍后在总结中显示
      const result = await deployCompiledBinary(true);
      blank();
      if (result) {
        return {
          ok: true,
          changed: true,
          summary: "部署完成",
          details: { target: result.target, size: result.size },
        };
      }
      return {
        ok: false,
        changed: false,
        summary: "部署失败",
        details: null,
      };
    },
  };
}

async function runPipeline(preset, options = {}) {
  const stepsToRun = presetToSteps(preset);
  const steps = buildSteps(options);
  const ctx = {};
  const results = [];

  // 整个流程用 groupStart/End 包裹
  groupStart("一键汉化流程");
  blank();

  for (const stepName of stepsToRun) {
    const fn = steps[stepName];
    if (!fn) continue;
    results.push(await runStep(ctx, stepName, fn));
    if (!results[results.length - 1].ok) break;
  }

  groupEnd();

  return {
    ok: results.every((r) => r.ok),
    steps: results,
    ctx,
  };
}

async function confirmIfNeeded(message, initialValue = true) {
  if (!process.stdout.isTTY) return initialValue;
  const answer = await p.confirm({ message, initialValue });
  if (p.isCancel(answer)) return null;
  return answer;
}

module.exports = {
  runPipeline,
  confirmIfNeeded,
  printPipelineSummary,
};

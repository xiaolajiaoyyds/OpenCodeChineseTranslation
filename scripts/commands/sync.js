/**
 * sync 命令
 * 同步官方版本：更新源码 → 检查新增文件 → 同步版本号
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const {
  step,
  success,
  error,
  warn,
  indent,
  blank,
  log,
  kv,
} = require("../core/colors.js");
const { getProjectDir, getOpencodeDir, getI18nDir } = require("../core/utils.js");
const {
  updateOpencodeVersion,
  fetchOpencodeVersion,
} = require("../core/version.js");
const updateCmd = require("./update.js");
const I18n = require("../core/i18n.js");
const { runPipeline } = require("../core/pipeline.js");
const { printPipelineSummary } = require("../core/pipeline.js");

/**
 * 获取官方版本号
 */
function getOfficialVersion() {
  const opencodeDir = getOpencodeDir();
  const pkgPath = path.join(
    opencodeDir,
    "packages",
    "opencode",
    "package.json",
  );

  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

/**
 * 获取当前 commit
 */
function getCurrentCommit() {
  const opencodeDir = getOpencodeDir();
  const { execSync } = require("child_process");

  try {
    const commit = execSync("git rev-parse HEAD", {
      cwd: opencodeDir,
      encoding: "utf-8",
    }).trim();
    return commit;
  } catch {
    return null;
  }
}

/**
 * 获取已配置的文件列表
 */
function checkNewFiles() {
  const i18n = new I18n();
  const configuredFiles = i18n.getConfiguredFiles();
  const newFiles = i18n.detectNewFiles();

  const tuiPath = path.join(getOpencodeDir(), "packages", "opencode", "src/cli/cmd/tui");
  const total = fs.existsSync(tuiPath) ? glob.sync("**/*.tsx", { cwd: tuiPath }).length : 0;

  return {
    newFiles,
    removedFiles: [],
    total,
    configured: configuredFiles.size,
  };
}

/**
 * 更新汉化配置版本号
 */
function updateConfigVersion(version, commit) {
  const i18nDir = getI18nDir();
  const configPath = path.join(i18nDir, "config.json");

  if (!fs.existsSync(configPath)) {
    return false;
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const zhVersion = `${version}-zh`;

  config.version = zhVersion;
  config.opencodeVersion = version; // 新增：官方版本号
  config.lastUpdate = new Date().toISOString().split("T")[0];
  if (commit) {
    config.supportedCommit = commit;
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
  return zhVersion;
}

/**
 * 更新脚本 package.json 版本号
 */
function updateScriptVersion(version) {
  const projectDir = getProjectDir();
  const zhVersion = `${version}-zh`;

  // 更新 scripts/package.json
  const scriptPkgPath = path.join(projectDir, "scripts", "package.json");
  if (fs.existsSync(scriptPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(scriptPkgPath, "utf-8"));
    pkg.version = zhVersion;
    fs.writeFileSync(scriptPkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // 更新根目录 package.json
  const rootPkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(rootPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    pkg.version = zhVersion;
    fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // 更新 opencode-i18n/config.json
  const i18nConfigPath = path.join(projectDir, "opencode-i18n", "config.json");
  if (fs.existsSync(i18nConfigPath)) {
    const config = JSON.parse(fs.readFileSync(i18nConfigPath, "utf-8"));
    config.version = zhVersion;
    config.opencodeVersion = version;
    config.lastUpdate = new Date().toISOString().split("T")[0];
    fs.writeFileSync(i18nConfigPath, JSON.stringify(config, null, 4) + "\n");
  }

  return zhVersion;
}

/**
 * 运行 sync 命令
 */
async function run(options = {}) {
  const { yes = false, checkOnly = false, autoFix = false } = options;

  step("同步官方版本");

  // 1. 获取当前状态
  const oldVersion = getOfficialVersion();
  const oldCommit = getCurrentCommit();

  if (oldVersion) {
    indent(`当前版本: ${oldVersion}`);
  }

  // 2. 更新源码（如果不是仅检查模式）
  if (!checkOnly) {
    step("更新源码");
    const updateResult = await updateCmd.run({ force: false });
    if (!updateResult) {
      error("更新源码失败");
      return false;
    }
  }

  // 3. 获取新版本信息
  const newVersion = getOfficialVersion();
  const newCommit = getCurrentCommit();

  if (!newVersion) {
    error("无法获取官方版本号");
    return false;
  }

  // 4. 检查版本变化
  const versionChanged = oldVersion !== newVersion;
  if (versionChanged) {
    success(`版本更新: ${oldVersion || "未知"} → ${newVersion}`);
  } else {
    indent(`版本未变化: ${newVersion}`);
  }

  // 5. 检查新增文件
  step("检查汉化覆盖率");
  const { newFiles, removedFiles, total, configured } = checkNewFiles();

  kv("源码文件", `${total} 个`);
  kv("已配置", `${configured} 个`);

  if (newFiles.length > 0) {
    warn(`发现 ${newFiles.length} 个新增文件需要汉化:`);
    newFiles.slice(0, 15).forEach((f) => indent(`+ ${f}`));
    if (newFiles.length > 15) {
      indent(`... 还有 ${newFiles.length - 15} 个文件`);
    }
  } else {
    success("没有新增文件需要汉化");
  }

  if (removedFiles.length > 0) {
    warn(`发现 ${removedFiles.length} 个文件已被删除:`);
    removedFiles.slice(0, 10).forEach((f) => indent(`- ${f}`));
  }

  // 6. 如果是仅检查模式，到此为止
  if (checkOnly) {
    step("检查完成（仅检查模式）");
    return true;
  }

  // 7. 同步版本号
  if (versionChanged || yes) {
    step("同步版本号");

    const configVersion = updateConfigVersion(newVersion, newCommit);
    const scriptVersion = updateScriptVersion(newVersion);

    if (configVersion && scriptVersion) {
      success(`汉化配置版本: ${configVersion}`);
      success(`脚本版本: ${scriptVersion}`);
      success(`对应 Commit: ${newCommit?.substring(0, 8) || "未知"}`);
    }
  }

  // 8. 总结
  blank();
  step("同步完成");

  if (newFiles.length > 0) {
    warn(`请为 ${newFiles.length} 个新增文件添加汉化配置！`);
    indent("提示: 运行 opencodenpm fix 一键修复到语言包并应用编译", 2);
    indent("提示: 运行 opencodenpm verify -d 查看详细信息", 2);
    if (autoFix && !checkOnly) {
      blank();
      step("自动一键修复并编译");
      const res = await runPipeline("repair", { skipUpdate: true });
      if (!res.ok) return false;
      printPipelineSummary("repair", res);
      const i18n = res.ctx.i18n;
      if (i18n) {
        blank();
        await i18n.showCoverageReportWithAI(res.ctx.newTranslations || null);
      }
    }
  }

  return true;
}

module.exports = { run, checkNewFiles, getOfficialVersion };

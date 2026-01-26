const fs = require("fs");
const path = require("path");
const {
  step,
  success,
  warn,
  error,
  indent,
  kv,
  blank,
} = require("../core/colors.js");
const { getProjectDir } = require("../core/utils.js");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function extractReadmeVersion(readmeText) {
  const m = readmeText.match(/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
  return m ? m[1] : null;
}

function hasChangelogEntry(changelogText, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s*\\[${escaped}\\]`, "m");
  return re.test(changelogText);
}

async function run(options = {}) {
  const { sync = false, strict = false } = options;

  step(sync ? "同步版本号" : "检查版本号一致性");

  const projectDir = getProjectDir();
  const configPath = path.join(projectDir, "opencode-i18n", "config.json");
  const scriptsPkgPath = path.join(projectDir, "scripts", "package.json");
  const rootPkgPath = path.join(projectDir, "package.json");
  const readmePath = path.join(projectDir, "README.md");
  const changelogPath = path.join(projectDir, "CHANGELOG.md");

  const config = readJSON(configPath);
  const desired = config.version;

  if (!desired) {
    error("opencode-i18n/config.json 缺少 version 字段");
    return false;
  }

  kv("目标版本", desired);

  const scriptsPkg = readJSON(scriptsPkgPath);
  const rootPkg = readJSON(rootPkgPath);

  const issues = [];
  if (scriptsPkg.version !== desired) {
    issues.push({
      file: "scripts/package.json",
      current: scriptsPkg.version,
      expected: desired,
    });
  }
  if (rootPkg.version !== desired) {
    issues.push({
      file: "package.json",
      current: rootPkg.version,
      expected: desired,
    });
  }

  if (sync) {
    if (issues.length === 0) {
      success("无需同步，版本已一致");
    } else {
      scriptsPkg.version = desired;
      rootPkg.version = desired;
      writeJSON(scriptsPkgPath, scriptsPkg);
      writeJSON(rootPkgPath, rootPkg);
      success(`已同步 ${issues.length} 处版本不一致`);
    }
  } else {
    if (issues.length === 0) {
      success("版本一致");
    } else {
      error(`发现 ${issues.length} 处版本不一致`);
      for (const item of issues) {
        indent(
          `- ${item.file}: 当前 ${item.current || "缺失"}，期望 ${item.expected}`,
          1,
        );
      }
      if (strict) return false;
    }
  }

  blank();
  step("文档一致性（告警级）");

  try {
    const readme = fs.readFileSync(readmePath, "utf8");
    const readmeVersion = extractReadmeVersion(readme);
    if (readmeVersion && readmeVersion !== desired) {
      warn(`README 版本为 ${readmeVersion}，与目标版本 ${desired} 不一致`);
    } else {
      success("README 版本匹配或未检测到版本号");
    }
  } catch (e) {
    warn(`README 检查失败: ${e.message}`);
  }

  try {
    const changelog = fs.readFileSync(changelogPath, "utf8");
    if (hasChangelogEntry(changelog, desired)) {
      success("CHANGELOG 包含当前版本条目");
    } else {
      warn("CHANGELOG 未发现当前版本条目");
    }
  } catch (e) {
    warn(`CHANGELOG 检查失败: ${e.message}`);
  }

  return issues.length === 0 || !strict;
}

module.exports = { run };


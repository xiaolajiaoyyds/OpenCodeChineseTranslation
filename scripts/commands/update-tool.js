/**
 * update-tool 命令
 * 更新汉化工具到最新版本并重新安装依赖
 */

const { execSync } = require("child_process");
const path = require("path");
const p = require("@clack/prompts");
const color = require("picocolors");
const {
  step,
  success,
  error,
  warn,
  indent,
  blank,
  isPlainMode,
} = require("../core/colors.js");

async function run() {
  blank();
  p.intro(
    color.bgCyan(
      color.black(isPlainMode() ? " 同步汉化工具 " : " 🔄 同步汉化工具 "),
    ),
  );

  try {
    // 1. 检查是否有更新
    step("检查更新");
    execSync("git fetch origin", { stdio: "inherit" });
    const localCommit = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    const remoteCommit = execSync("git rev-parse origin/main", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (localCommit === remoteCommit) {
      success("已经是最新版本");
      blank();
      p.outro(color.green("✓ 无需更新"));
      return true;
    }

    // 有更新可用
    blank();
    const hasUpdate = await p.confirm({
      message: "发现新版本，是否更新？",
      initialValue: true,
    });

    if (p.isCancel(hasUpdate)) {
      p.cancel("已取消");
      return false;
    }

    if (!hasUpdate) {
      success("已跳过更新");
      blank();
      p.outro(color.green("✓ 跳过更新"));
      return true;
    }

    // 2. 拉取更新
    blank();
    step("更新汉化工具");
    execSync("git pull origin main", { stdio: "inherit" });
    success("更新完成");

    // 3. 重新安装依赖
    blank();
    step("重新安装依赖");
    indent("正在安装 scripts 依赖...", 2);
    execSync("npm install", {
      cwd: path.join(__dirname, "../.."),
      stdio: "inherit",
    });
    success("依赖安装完成");

    blank();
    p.outro(color.green("✓ 更新完成！请重新运行工具"));
    return true;
  } catch (e) {
    error(`更新失败: ${e.message}`);
    blank();
    indent("可能的解决方案:", 2);
    indent("1. 检查网络连接", 2);
    indent("2. 手动执行: git pull origin main", 2);
    indent("3. 手动执行: npm install", 2);
    blank();
    p.outro(color.red("✗ 更新失败"));
    return false;
  }
}

module.exports = { run };

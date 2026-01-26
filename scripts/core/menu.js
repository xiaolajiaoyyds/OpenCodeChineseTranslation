/**
 * 交互式菜单 - 使用 @clack/prompts
 */

const p = require("@clack/prompts");
const fs = require("fs");
const path = require("path");
const color = require("picocolors");
const {
  getOpencodeDir,
  getI18nDir,
  exists,
  getPlatform,
} = require("./utils.js");
const { isOpencodeRunning } = require("./env.js");
const {
  blank,
  padLabel,
  statusBadge,
  groupStart,
  groupEnd,
  kv,
  indent,
  isPlainMode,
} = require("./colors.js");

const fullCmd = require("../commands/full.js");
const updateCmd = require("../commands/update-tool.js");
const fixCmd = require("../commands/fix.js");
const aiCmd = require("../commands/ai.js");

function getVersionInfo() {
  try {
    const configPath = path.join(getI18nDir(), "config.json");
    if (exists(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.opencodeVersion) {
        return {
          official: config.opencodeVersion,
          zh: config.version || `${config.opencodeVersion}-zh`,
        };
      }
    }
  } catch (e) {}

  try {
    const pkgPath = path.join(
      getOpencodeDir(),
      "packages",
      "opencode",
      "package.json",
    );
    if (exists(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return { official: pkg.version, zh: `${pkg.version}-zh` };
    }
  } catch (e) {}

  return { official: null, zh: "未知版本" };
}

function getBuildPlatform() {
  const { platform, arch } = getPlatform();
  const map = {
    darwin: `darwin-${arch}`,
    linux: `linux-${arch}`,
    win32: arch === "arm64" ? "windows-arm64" : "windows-x64",
  };
  return map[platform] || "linux-x64";
}

function getDistPath() {
  const plt = getBuildPlatform();
  const ext = plt.startsWith("windows") ? ".exe" : "";
  return path.join(
    getOpencodeDir(),
    "packages",
    "opencode",
    "dist",
    `opencode-${plt}`,
    "bin",
    `opencode${ext}`,
  );
}

function getDistDir() {
  return path.join(
    getOpencodeDir(),
    "packages",
    "opencode",
    "dist",
    `opencode-${getBuildPlatform()}`,
  );
}

function makeClickable(text, filePath) {
  if (isPlainMode()) return text;
  return `\x1b]8;;file://${filePath}\x07${text}\x1b]8;;\x07`;
}

function label(icon, text) {
  return isPlainMode() ? text : `${icon} ${text}`;
}

function showEnvInfo() {
  const { checkNode, checkBun, checkGit } = require("./env.js");
  const { execSync } = require("child_process");

  const node = checkNode();
  const bun = checkBun();
  const git = checkGit();
  const { platform, arch, isMac, isWindows, useUnixCommands } = getPlatform();
  const platformNames = { darwin: "macOS", linux: "Linux", win32: "Windows" };

  groupStart("系统环境");

  const nodeStatus = node.ok ? "success" : "error";
  kv(
    padLabel("Node", 10),
    `${statusBadge(nodeStatus)}  ${node.version ? color.dim(node.version) : color.red("未安装")}`,
  );

  const bunStatus = bun.ok
    ? bun.isCorrectVersion
      ? "success"
      : "warn"
    : "error";
  kv(
    padLabel("Bun", 10),
    `${statusBadge(bunStatus)}  ${bun.version ? color.dim(bun.version) : color.red("未安装")}`,
  );

  const gitStatus = git.ok ? "success" : "error";
  kv(
    padLabel("Git", 10),
    `${statusBadge(gitStatus)}  ${git.ok ? color.dim("已安装") : color.red("未安装")}`,
  );

  let hwInfo = `${platformNames[platform] || platform} ${arch}`;
  try {
    if (isMac) {
      const model = execSync("sysctl -n hw.model", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      const chip = execSync("sysctl -n machdep.cpu.brand_string", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      hwInfo = `${model} · ${chip}`;
    }
  } catch (e) {}
  kv(padLabel("设备信息", 10), color.dim(hwInfo));

  groupEnd();

  blank();

  groupStart("运行状态");

  const runningInfo = isOpencodeRunning();
  let ocPath = null;
  try {
    const cmd = useUnixCommands ? "which opencode" : "where opencode";
    ocPath = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n")[0];
  } catch (e) {}

  let recommend = null;

  if (ocPath && fs.existsSync(ocPath)) {
    const status = runningInfo.running
      ? color.green("运行中")
      : color.dim("已停止");
    const clickable = makeClickable(color.dim(ocPath), path.dirname(ocPath));
    kv(padLabel("OpenCode", 10), `${status}  ${clickable}`);
  } else {
    kv(
      padLabel("OpenCode", 10),
      `${color.yellow("未安装")} ${color.dim("→ 运行 deploy")}`,
    );
    recommend = "运行 deploy";
  }

  const distPath = getDistPath();
  const distDir = getDistDir();
  if (exists(distPath)) {
    const clickable = makeClickable(
      color.dim(`dist/opencode-${getBuildPlatform()}`),
      distDir,
    );
    kv(padLabel("构建产物", 10), `${color.green("已生成")}  ${clickable}`);
  } else {
    kv(
      padLabel("构建产物", 10),
      `${color.yellow("未生成")} ${color.dim("→ 运行 build")}`,
    );
    if (!recommend) recommend = "运行 build";
  }

  if (!recommend) recommend = "无需操作";

  kv(padLabel("推荐", 10), color.cyan(recommend));

  groupEnd();

  blank();

  groupStart("项目信息");

  kv(padLabel("作者", 10), color.dim("xiaolajiao"));
  kv(
    padLabel("GitHub", 10),
    color.dim("https://github.com/xiaolajiao/OpenCodeChineseTranslation"),
  );
  kv(padLabel("汉化版本", 10), color.green(getVersionInfo().zh));

  groupEnd();
}

const MENU_OPTIONS = [
  {
    value: "full",
    label: label("🚀", "一键汉化"),
    hint: "下载/更新 → 扫描 → 汉化 → 检查 → 应用 → 构建 → 部署",
  },
  {
    value: "update",
    label: label("🔄", "同步工具"),
    hint: "更新汉化工具到最新版本并重新安装依赖",
  },
  {
    value: "fix",
    label: label("🩹", "一键修复"),
    hint: "扫描 → 汉化 → 检查 → 修复 → 应用 → 构建 → 部署",
  },
  {
    value: "ai",
    label: label("⚙️", "配置 AI"),
    hint: "设置 OPENAI_API_KEY/BASE/MODEL（编译版也可用）",
  },
  { value: "exit", label: label("👋", "退出程序") },
];

const NEXT_STEP_MAP = {
  full: {
    recommended: "menu",
    options: [
      { value: "menu", label: label("📋", "返回主菜单") },
      { value: "exit", label: label("👋", "退出程序") },
    ],
  },
  update: {
    recommended: "menu",
    options: [
      { value: "menu", label: label("📋", "返回主菜单") },
      { value: "exit", label: label("👋", "退出程序") },
    ],
  },
  fix: {
    recommended: "menu",
    options: [
      { value: "menu", label: label("📋", "返回主菜单") },
      { value: "exit", label: label("👋", "退出程序") },
    ],
  },
};

async function runCommand(cmd) {
  blank();

  try {
    switch (cmd) {
      case "full":
        await fullCmd.run({ auto: false });
        break;
      case "update":
        await updateCmd.run();
        break;
      case "fix":
        await fixCmd.run({});
        break;
      case "ai":
        await aiCmd.run({ interactive: true });
        break;
      case "exit":
        p.outro(
          color.cyan(isPlainMode() ? "再见~ 下次见！" : "🐰 再见~ 下次见！"),
        );
        process.exit(0);
      case "menu":
        return "menu";
    }
    return "success";
  } catch (e) {
    p.log.error(`执行失败: ${e.message}`);
    return "error";
  }
}

async function askNextStep(currentCmd) {
  const config = NEXT_STEP_MAP[currentCmd] || {
    recommended: "menu",
    options: [
      { value: "menu", label: label("📋", "返回菜单") },
      { value: "exit", label: label("👋", "退出") },
    ],
  };

  blank();

  const next = await p.select({
    message: "下一步",
    options: config.options,
    initialValue: config.recommended,
  });

  if (p.isCancel(next)) {
    p.cancel("已取消");
    process.exit(0);
  }

  return next;
}

async function showMenu() {
  console.clear();

  const versionInfo = getVersionInfo();
  const officialVersion = versionInfo.official || "未同步";

  p.intro(
    color.bgCyan(
      color.black(
        isPlainMode()
          ? ` OpenCode 汉化工具 v${officialVersion} `
          : ` 🐰 OpenCode 汉化工具 v${officialVersion} `,
      ),
    ),
  );

  showEnvInfo();

  const action = await p.select({
    message: "选择操作",
    options: MENU_OPTIONS,
    initialValue: "full",
  });

  if (p.isCancel(action)) {
    p.cancel("已取消");
    process.exit(0);
  }

  if (action === "exit") {
    p.outro(color.cyan(isPlainMode() ? "再见~ 下次见！" : "🐰 再见~ 下次见！"));
    process.exit(0);
  }

  const result = await runCommand(action);

  if (result === "menu") {
    await showMenu();
    return;
  }

  let nextAction = await askNextStep(action);

  while (nextAction !== "menu" && nextAction !== "exit") {
    const cmdResult = await runCommand(nextAction);
    if (cmdResult === "menu") {
      await showMenu();
      return;
    }
    nextAction = await askNextStep(nextAction);
  }

  if (nextAction === "menu") {
    await showMenu();
  } else {
    p.outro(color.cyan(isPlainMode() ? "再见~ 下次见！" : "🐰 再见~ 下次见！"));
  }
}

async function run() {
  await showMenu();
}

module.exports = { run };

/**
 * deploy 命令
 * 部署 opencode 到全局（跨平台）
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const readline = require("readline");
const p = require("@clack/prompts");
const {
  getPlatform,
  getOpencodeConfigPath,
  ensureDir,
} = require("../core/utils.js");
const {
  step,
  success,
  error,
  warn,
  indent,
  blank,
  isPlainMode,
} = require("../core/colors.js");
const { isOpencodeRunning } = require("../core/env.js");
const { getCompiledBinary, deployBinary } = require("../core/deployer.js");

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function confirmAction(message) {
  if (!process.stdout.isTTY) {
    const answer = await askQuestion(message);
    return answer === "y" || answer === "yes";
  }
  const answer = await p.confirm({ message, initialValue: false });
  if (p.isCancel(answer)) {
    p.cancel("Cancelled");
    return null;
  }
  return answer;
}

function checkAutoupdateConfig() {
  const configPath = getOpencodeConfigPath();
  if (!fs.existsSync(configPath)) {
    return { exists: false, hasAutoupdate: false };
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return { exists: true, hasAutoupdate: config.autoupdate === false };
  } catch (e) {
    return { exists: true, hasAutoupdate: false };
  }
}

function setAutoupdateConfig() {
  const configPath = getOpencodeConfigPath();
  let config = {};

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {
      config = {};
    }
  }

  config.autoupdate = false;
  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return configPath;
}

async function promptAutoupdateConfig() {
  const { hasAutoupdate } = checkAutoupdateConfig();
  if (hasAutoupdate) {
    return;
  }

  const configPath = getOpencodeConfigPath();
  blank();
  warn(
    isPlainMode()
      ? "提示: 如需禁用版本更新提示"
      : "💡 提示: 如需禁用版本更新提示",
  );
  indent(`配置文件: ${configPath}`);
  indent(`添加配置: "autoupdate": false`);
  blank();

  const shouldWrite = await confirmAction("是否自动添加此配置?");
  if (shouldWrite) {
    const savedPath = setAutoupdateConfig();
    success(`已添加配置: ${savedPath}`);
  }
}

async function run(options = {}) {
  step("部署 opencode");

  const runningInfo = isOpencodeRunning();
  if (runningInfo.running) {
    const { processes } = runningInfo;
    const { isWindows } = getPlatform();
    warn(
      isPlainMode()
        ? "警告: 检测到 OpenCode 正在运行！"
        : "⚠️  检测到 OpenCode 正在运行！",
    );
    indent("以下进程可能阻止部署:");
    for (const proc of processes) {
      indent(`  PID ${proc.pid}: ${proc.command}`, 2);
    }
    blank();
    const shouldKill = await confirmAction("是否终止进程并继续部署?");
    if (!shouldKill) {
      indent("已取消部署", 2);
      return false;
    }
    // 强制终止进程
    const pids = processes.map((p) => p.pid).join(" ");
    try {
      if (isWindows) {
        execSync(`taskkill /F /PID ${pids.split(" ").join(" /PID ")}`, {
          stdio: "pipe",
        });
      } else {
        execSync(`kill -9 ${pids}`, { stdio: "pipe" });
      }
      success("已终止相关进程");
    } catch (e) {
      warn("部分进程可能已退出，继续部署...");
    }
  }

  const binaryPath = getCompiledBinary();
  if (!binaryPath) {
    error("未找到编译产物，请先运行: opencodenpm build");
    return false;
  }

  indent(`源文件: ${binaryPath}`);

  try {
    const result = await deployBinary(binaryPath);
    if (result) {
      blank();
      indent("运行 opencode 启动");

      await promptAutoupdateConfig();
    }
    return !!result;
  } catch (e) {
    error(`部署失败: ${e.message}`);
    return false;
  }
}

module.exports = { run };

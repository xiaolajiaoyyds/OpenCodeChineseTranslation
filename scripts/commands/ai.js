const p = require("@clack/prompts");
const color = require("picocolors");
const {
  loadUserConfig,
  saveUserConfig,
  getUserConfigPath,
} = require("../core/user-config.js");
const {
  step,
  success,
  warn,
  error,
  indent,
  blank,
  isPlainMode,
} = require("../core/colors.js");

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function run(options = {}) {
  const { interactive = true, show = false, clear = false } = options;
  const current = loadUserConfig();

  if (show) {
    step("AI 配置");
    indent(`配置文件: ${getUserConfigPath()}`);
    indent(
      `OPENAI_API_KEY: ${current.openaiApiKey ? maskKey(current.openaiApiKey) : "(未设置)"}`,
    );
    indent(`OPENAI_API_BASE: ${current.openaiApiBase || "(未设置)"}`);
    indent(`OPENAI_MODEL: ${current.openaiModel || "(未设置)"}`);
    indent(`NPM 镜像源: ${current.npmRegistry || "(默认)"}`);
    return true;
  }

  if (clear) {
    const next = { ...current };
    delete next.openaiApiKey;
    delete next.openaiApiBase;
    delete next.openaiModel;
    delete next.npmRegistry;
    const saved = saveUserConfig(next);
    success(`已清空 AI 配置: ${saved}`);
    return true;
  }

  if (!interactive) return true;

  blank();
  p.intro(
    color.bgCyan(
      color.black(isPlainMode() ? " AI 配置向导 " : " ⚙ AI 配置向导 "),
    ),
  );
  indent(`配置将保存到: ${getUserConfigPath()}`, 2);
  blank();

  const configType = await p.select({
    message: "请选择配置方式",
    options: [
      { value: "custom", label: "自定义配置 (OpenAI/Claude/Gemini)" },
      {
        value: "siliconflow",
        label: "使用免费 DeepSeek V3 (硅基流动) [推荐]",
        hint: "永久免费，国内直连",
      },
      {
        value: "bigmodel",
        label: "使用免费 GLM-4 (智谱 AI)",
        hint: "免费 GLM-4-Flash",
      },
    ],
  });

  if (p.isCancel(configType)) {
    p.cancel("已取消");
    return false;
  }

  let apiKey = "";
  let apiBase = "";
  let model = "";

  if (configType === "siliconflow") {
    p.note(
      "请前往 https://cloud.siliconflow.cn/ 注册账号并创建 API Key\nDeepSeek V3 / Qwen 2.5 等模型永久免费！",
      "硅基流动 (SiliconFlow)",
    );
    apiKey = await p.password({
      message: "请输入硅基流动 API Key (sk-...)",
      validate: (value) => {
        if (!value) return "API Key 不能为空";
        if (!value.startsWith("sk-"))
          return "API Key 格式不正确 (应以 sk- 开头)";
      },
    });
    apiBase = "https://api.siliconflow.cn/v1";
    model = "deepseek-ai/DeepSeek-V3";
  } else if (configType === "bigmodel") {
    p.note(
      "请前往 https://bigmodel.cn/ 注册账号并获取 API Key\nGLM-4-Flash 模型完全免费！",
      "智谱 AI (BigModel)",
    );
    apiKey = await p.password({
      message: "请输入智谱 AI API Key",
      validate: (value) => {
        if (!value) return "API Key 不能为空";
      },
    });
    apiBase = "https://open.bigmodel.cn/api/paas/v4";
    model = "glm-4-flash";
  } else {
    apiKey = await p.password({
      message: "请输入 OPENAI_API_KEY",
      placeholder: current.openaiApiKey
        ? maskKey(current.openaiApiKey)
        : "sk-...",
    });
    if (p.isCancel(apiKey)) {
      p.cancel("已取消");
      return false;
    }

    apiBase = await p.text({
      message: "请输入 OPENAI_API_BASE（可空）",
      placeholder: current.openaiApiBase || "http://127.0.0.1:8045/v1",
    });
    if (p.isCancel(apiBase)) {
      p.cancel("已取消");
      return false;
    }

    model = await p.text({
      message: "请输入 OPENAI_MODEL（可空）",
      placeholder: current.openaiModel || "",
    });
    if (p.isCancel(model)) {
      p.cancel("已取消");
      return false;
    }
  }

  if (p.isCancel(apiKey)) {
    p.cancel("已取消");
    return false;
  }

  const next = {
    ...current,
    openaiApiKey: apiKey || current.openaiApiKey || "",
    openaiApiBase: apiBase || "",
    openaiModel: model || "",
  };

  const useMirror = await p.confirm({
    message: "是否使用国内镜像源加速构建 (Bun)?",
    initialValue: !!current.npmRegistry || false,
  });
  if (p.isCancel(useMirror)) {
    p.cancel("已取消");
    return false;
  }

  if (useMirror) {
    next.npmRegistry = "https://registry.npmmirror.com";
  } else {
    delete next.npmRegistry;
  }

  if (!next.openaiApiKey) {
    warn("未设置 OPENAI_API_KEY，AI 功能将不可用");
  }

  try {
    const saved = saveUserConfig(next);
    success(`已保存 AI 配置: ${saved}`);
    return true;
  } catch (e) {
    error(`保存失败: ${e.message}`);
    return false;
  }
}

module.exports = { run };

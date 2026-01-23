/**
 * antigravity 命令
 * 一键配置 Antigravity Tools 端点
 *
 * 功能：
 * - 自动检测端点可用性
 * - 自动获取可用模型列表
 * - 可选 API Key（本地服务通常无需认证）
 * - TUI 风格输入框
 * - 一键写入配置
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { step, success, error, warn, log } = require('../core/colors.js');
const {
  confirm: gridConfirm,
  waitForKey,
  showInputBox,
  showSelectList,
  showMultiSelectList,
} = require('../core/grid-menu.js');

// 默认 Antigravity 端点
const DEFAULT_ENDPOINT = 'http://127.0.0.1:8045';

// 推荐的默认模型列表
const RECOMMENDED_MODELS = [
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-thinking',
  'claude-opus-4-5-thinking',
  'gemini-3-pro-high',
  'gemini-3-pro-low',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-thinking',
];

/**
 * 获取 OpenCode 配置目录
 */
function getOpencodeConfigDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.config', 'opencode');
}

/**
 * 获取 OpenCode 配置文件路径
 */
function getOpencodeConfigPath() {
  const configDir = getOpencodeConfigDir();
  const jsonc = path.join(configDir, 'opencode.jsonc');
  const json = path.join(configDir, 'opencode.json');

  if (fs.existsSync(jsonc)) return jsonc;
  if (fs.existsSync(json)) return json;
  return json;
}

/**
 * 读取 OpenCode 配置
 */
function readOpencodeConfig() {
  const configPath = getOpencodeConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    let content = fs.readFileSync(configPath, 'utf-8');
    content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(content);
  } catch (e) {
    warn(`配置文件解析失败: ${e.message}`);
    return {};
  }
}

/**
 * 写入 OpenCode 配置
 */
function writeOpencodeConfig(config) {
  const configPath = getOpencodeConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  config.$schema = 'https://opencode.ai/config.json';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

/**
 * 测试端点连接
 */
async function testEndpoint(endpoint) {
  try {
    const url = `${endpoint}/v1/models`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 获取可用模型列表
 */
async function fetchModels(endpoint) {
  try {
    const url = `${endpoint}/v1/models`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    // OpenAI 兼容格式: { data: [{ id: "model-name", ... }] }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m) => ({
        id: m.id,
        name: m.id,
        owned_by: m.owned_by || 'antigravity',
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * 构建模型配置
 */
function buildModelConfig(models) {
  const config = {};

  for (const model of models) {
    const modelId = `antigravity/${model.id}`;
    config[modelId] = {
      name: model.name || model.id,
      // 根据模型名称推断 token 限制
      limit: inferTokenLimits(model.id),
    };
  }

  return config;
}

/**
 * 推断 token 限制
 */
function inferTokenLimits(modelId) {
  const id = modelId.toLowerCase();

  // Claude 系列
  if (id.includes('claude')) {
    return { context: 200000, output: 8192 };
  }
  // GPT 系列
  if (id.includes('gpt-4') || id.includes('gpt4')) {
    return { context: 128000, output: 16384 };
  }
  if (id.includes('gpt-5') || id.includes('gpt5')) {
    return { context: 128000, output: 32768 };
  }
  // Gemini 系列
  if (id.includes('gemini')) {
    return { context: 1000000, output: 8192 };
  }
  // DeepSeek 系列
  if (id.includes('deepseek')) {
    return { context: 64000, output: 8192 };
  }
  // Qwen 系列
  if (id.includes('qwen')) {
    return { context: 128000, output: 8192 };
  }
  // 默认
  return { context: 32000, output: 4096 };
}

/**
 * 选择推荐模型
 */
function selectRecommendedModel(models) {
  const priorities = [
    'claude-sonnet',
    'claude-4',
    'claude-3.5',
    'gpt-4o',
    'gpt-4',
    'gemini-pro',
    'deepseek',
    'qwen',
  ];

  for (const priority of priorities) {
    const found = models.find((m) => m.id.toLowerCase().includes(priority));
    if (found) {
      return `antigravity/${found.id}`;
    }
  }

  // 返回第一个
  return models.length > 0 ? `antigravity/${models[0].id}` : null;
}

/**
 * 配置 Antigravity 端点
 */
async function configureAntigravity(options = {}) {
  console.log('');
  log(`${'═'.repeat(50)}`, 'cyan');
  log('  Antigravity Tools 配置向导', 'cyan');
  log(`${'═'.repeat(50)}`, 'cyan');
  console.log('');

  log('  Antigravity Tools 是本地 AI 模型代理服务', 'dim');
  log('  支持 Claude / GPT / Gemini / DeepSeek 等模型', 'dim');
  log(`  默认端点: ${DEFAULT_ENDPOINT}`, 'dim');
  console.log('');

  // 1. 输入端点地址
  step('步骤 1/4: 配置端点地址');
  log('  直接回车使用默认端点，或输入自定义地址', 'dim');

  const endpoint = await showInputBox({
    title: '请输入 Antigravity 端点地址',
    placeholder: DEFAULT_ENDPOINT,
    defaultValue: DEFAULT_ENDPOINT,
  });

  if (endpoint === null) {
    warn('配置已取消');
    return false;
  }

  success(`端点地址: ${endpoint}`);

  // 2. 测试连接
  step('步骤 2/4: 测试端点连接');
  log(`  正在连接 ${endpoint}...`, 'dim');

  const isOnline = await testEndpoint(endpoint);

  if (!isOnline) {
    error('端点无法连接!');
    console.log('');
    log('  可能的原因:', 'yellow');
    log('    1. Antigravity Tools 服务未启动', 'dim');
    log('    2. 端点地址不正确', 'dim');
    log('    3. 防火墙阻止了连接', 'dim');
    console.log('');
    log('  解决方法:', 'yellow');
    log('    1. 确保 Antigravity Tools 服务已启动', 'dim');
    log('    2. 检查端点地址是否正确', 'dim');
    log(`    3. 尝试访问 ${endpoint}/v1/models`, 'dim');
    console.log('');

    const continueAnyway = await gridConfirm('是否仍要保存配置?', false);
    if (!continueAnyway) {
      warn('配置已取消');
      return false;
    }
  } else {
    success('端点连接成功!');
  }

  // 3. 获取可用模型
  step('步骤 3/5: 获取可用模型');
  let models = await fetchModels(endpoint);

  if (models.length === 0) {
    warn('未获取到模型列表，将使用预设模型');
    // 使用预设模型
    models = [
      { id: 'claude-sonnet-4-5', name: 'Claude 4.5 Sonnet' },
      { id: 'claude-sonnet-4-5-thinking', name: 'Claude 4.5 Sonnet (Thinking)' },
      { id: 'claude-opus-4-5-thinking', name: 'Claude 4.5 Opus (Thinking)' },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
      { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro High' },
      { id: 'gemini-3-pro-low', name: 'Gemini 3 Pro Low' },
      { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro (Image)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemini-2.5-flash-thinking', name: 'Gemini 2.5 Flash (Thinking)' },
    ];
  } else {
    success(`发现 ${models.length} 个可用模型`);
  }

  // 4. 让用户选择要配置的模型
  step('步骤 4/5: 选择要配置的模型');
  log('  使用空格切换选中，/ 搜索，A 全选', 'dim');

  // 计算默认选中的模型（推荐模型）
  const defaultSelected = models
    .filter(m => RECOMMENDED_MODELS.some(r => m.id.toLowerCase().includes(r.toLowerCase())))
    .map(m => m.id);

  const selectedModels = await showMultiSelectList({
    title: '选择要配置的模型（空格切换，Enter确认）',
    items: models.map(m => ({ id: m.id, name: m.name || m.id })),
    defaultSelected: defaultSelected.length > 0 ? defaultSelected : models.slice(0, 6).map(m => m.id),
    maxVisible: 12,
  });

  if (!selectedModels || selectedModels.length === 0) {
    warn('未选择任何模型，配置已取消');
    return false;
  }

  success(`已选择 ${selectedModels.length} 个模型`);

  // 5. 可选 API Key
  step('步骤 5/5: 配置 API Key (可选)');
  log('  本地服务通常无需 API Key', 'dim');
  log('  直接回车跳过，或输入你的 API Key', 'dim');

  const apiKey = await showInputBox({
    title: 'API Key (可选，直接回车跳过)',
    placeholder: '留空表示无需认证',
    defaultValue: '',
    password: true,
  });

  // 确认配置
  console.log('');
  log(`${'─'.repeat(50)}`, 'dim');
  log('  配置预览:', 'cyan');
  log(`    端点: ${endpoint}`, 'white');
  log(`    已选模型: ${selectedModels.length} 个`, 'white');
  selectedModels.slice(0, 5).forEach(m => {
    log(`      - ${m.id}`, 'dim');
  });
  if (selectedModels.length > 5) {
    log(`      ... 还有 ${selectedModels.length - 5} 个`, 'dim');
  }
  log(`    API Key: ${apiKey ? '已设置 (*****)' : '未设置 (无需认证)'}`, 'white');
  log(`${'─'.repeat(50)}`, 'dim');
  console.log('');

  const confirmSave = await gridConfirm('确认保存配置?', true);

  if (!confirmSave) {
    warn('配置已取消');
    return false;
  }

  // 写入配置
  step('保存配置');

  const config = readOpencodeConfig();

  if (!config.provider) {
    config.provider = {};
  }

  // 构建 provider 配置
  const providerOptions = {
    baseURL: `${endpoint}/v1`,
  };

  if (apiKey) {
    providerOptions.apiKey = apiKey;
  }

  config.provider.antigravity = {
    npm: '@ai-sdk/openai-compatible',
    name: 'Antigravity Tools',
    options: providerOptions,
    models: buildModelConfig(selectedModels),
  };

  // 设置推荐的默认模型
  const recommendedModel = selectRecommendedModel(selectedModels);
  if (recommendedModel && !config.model) {
    config.model = recommendedModel;
    log(`  设置默认模型: ${recommendedModel}`, 'cyan');
  }

  const configPath = writeOpencodeConfig(config);

  success('配置保存成功!');
  console.log('');

  log(`${'═'.repeat(50)}`, 'green');
  log('  ✓ Antigravity Tools 配置完成!', 'green');
  log(`${'═'.repeat(50)}`, 'green');
  console.log('');

  log('  配置文件:', 'white');
  log(`    ${configPath}`, 'dim');
  console.log('');

  log('  已配置的模型:', 'white');
  selectedModels.slice(0, 5).forEach((m) => {
    log(`    ✓ antigravity/${m.id}`, 'green');
  });
  if (selectedModels.length > 5) {
    log(`    ... 还有 ${selectedModels.length - 5} 个模型`, 'dim');
  }
  console.log('');

  log('  下一步操作:', 'yellow');
  log('    1. 启动 OpenCode: opencode', 'dim');
  log('    2. 运行 /models 选择模型', 'dim');
  log('    3. 开始使用!', 'dim');
  console.log('');

  if (!isOnline) {
    warn('注意: 端点当前不可用，请先启动 Antigravity Tools 服务');
    console.log('');
  }

  return true;
}

/**
 * 主运行函数
 */
async function run(options = {}) {
  return await configureAntigravity(options);
}

module.exports = {
  run,
  configureAntigravity,
  testEndpoint,
  fetchModels,
  getOpencodeConfigPath,
  readOpencodeConfig,
  writeOpencodeConfig,
  DEFAULT_ENDPOINT,
};

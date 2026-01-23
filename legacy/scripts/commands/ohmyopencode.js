/**
 * ohmyopencode 命令
 * 一键安装和配置 oh-my-opencode 插件
 *
 * 功能：
 * - 检查 OpenCode 是否已安装
 * - 自动安装 oh-my-opencode 插件
 * - 配置智能体模型（可选使用 Antigravity）
 * - 完整的向导式安装流程
 * - TUI 风格交互
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { step, success, error, warn, log } = require('../core/colors.js');
const { exec } = require('../core/utils.js');
const {
  confirm: gridConfirm,
  waitForKey,
  showSelectList,
  showMultiSelectList,
} = require('../core/grid-menu.js');
const {
  readOpencodeConfig,
  writeOpencodeConfig,
  DEFAULT_ENDPOINT,
  testEndpoint,
  fetchModels,
} = require('./antigravity.js');

// oh-my-opencode 包名
const OMO_PACKAGE = 'oh-my-opencode';

// Oh-My-OpenCode 智能体角色配置
const OMO_AGENT_ROLES = [
  { id: 'Sisyphus', name: 'Sisyphus (主编排)', recommended: 'claude-opus-4-5-thinking', description: '主智能体编排' },
  { id: 'oracle', name: 'Oracle (战略分析)', recommended: 'gemini-3-pro-high', description: '战略分析智能体' },
  { id: 'frontend-ui-ux-engineer', name: 'Frontend (UI/UX)', recommended: 'gemini-3-pro-high', description: 'UI/UX 设计智能体' },
  { id: 'document-writer', name: 'Document (文档)', recommended: 'gemini-3-flash', description: '文档撰写智能体' },
  { id: 'multimodal-looker', name: 'Looker (多模态)', recommended: 'gemini-3-flash', description: '多模态分析智能体' },
  { id: 'librarian', name: 'Librarian (研究)', recommended: 'claude-sonnet-4-5', description: '文档研究智能体' },
  { id: 'explore', name: 'Explore (探索)', recommended: 'gemini-3-flash', description: '代码探索智能体' },
];

/**
 * 获取 oh-my-opencode 配置文件路径
 */
function getOmoConfigPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.config', 'opencode', 'oh-my-opencode.json');
}

/**
 * 读取 oh-my-opencode 配置
 */
function readOmoConfig() {
  const configPath = getOmoConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    let content = fs.readFileSync(configPath, 'utf-8');
    content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(content);
  } catch (e) {
    warn(`oh-my-opencode 配置解析失败: ${e.message}`);
    return {};
  }
}

/**
 * 写入 oh-my-opencode 配置
 */
function writeOmoConfig(config) {
  const configPath = getOmoConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  config.$schema =
    'https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json';

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

/**
 * 检查 OpenCode 是否已安装
 */
function checkOpencodeInstalled() {
  try {
    const result = exec('opencode --version', { stdio: 'pipe' });
    return { installed: true, version: result.trim() };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * 检查 oh-my-opencode 是否已安装
 */
function isOmoInstalled() {
  try {
    const config = readOpencodeConfig();
    const plugins = config.plugin || [];
    return plugins.some(
      (p) => p === OMO_PACKAGE || (typeof p === 'string' && p.startsWith(OMO_PACKAGE))
    );
  } catch {
    return false;
  }
}

/**
 * 安装 oh-my-opencode 插件
 */
async function installOmo(options = {}) {
  console.log('');
  log(`${'═'.repeat(50)}`, 'cyan');
  log('  Oh My OpenCode 安装向导', 'cyan');
  log(`${'═'.repeat(50)}`, 'cyan');
  console.log('');

  log('  Oh My OpenCode 是 OpenCode 的强大增强插件', 'dim');
  log('  提供专业智能体、后台任务、LSP 增强等功能', 'dim');
  log('  项目: github.com/code-yeongyu/oh-my-opencode', 'dim');
  console.log('');

  // 1. 检查 OpenCode 是否已安装
  step('步骤 1/5: 检查 OpenCode');
  const opencodeStatus = checkOpencodeInstalled();

  if (!opencodeStatus.installed) {
    error('OpenCode 未安装!');
    console.log('');
    log('  请先安装 OpenCode:', 'yellow');
    log('    npm i -g opencode-ai', 'dim');
    log('    # 或使用 brew', 'dim');
    log('    brew install anomalyco/tap/opencode', 'dim');
    console.log('');
    log('  安装完成后重新运行此命令', 'dim');
    return false;
  }

  success(`OpenCode 已安装: ${opencodeStatus.version}`);

  // 2. 检查是否已安装 oh-my-opencode
  step('步骤 2/5: 检查插件状态');
  const alreadyInstalled = isOmoInstalled();

  if (alreadyInstalled) {
    log('  oh-my-opencode 已安装', 'cyan');
    const reinstall = await gridConfirm('是否重新配置?', true);
    if (!reinstall) {
      log('  保持现有配置', 'dim');
      return true;
    }
  } else {
    log('  oh-my-opencode 未安装，将进行安装', 'dim');
  }

  // 3. 检查 Antigravity 端点
  step('步骤 3/6: 检查 Antigravity 端点');
  log(`  正在检测 ${DEFAULT_ENDPOINT}...`, 'dim');

  const antigravityOnline = await testEndpoint(DEFAULT_ENDPOINT);
  let useAntigravity = false;
  let availableModels = [];
  let agentModelAssignments = {};

  if (antigravityOnline) {
    success('Antigravity Tools 端点可用');
    useAntigravity = await gridConfirm('是否使用 Antigravity 端点配置智能体模型?', true);

    if (useAntigravity) {
      // 获取可用模型列表
      step('步骤 4/6: 获取可用模型');
      log('  正在获取模型列表...', 'dim');
      availableModels = await fetchModels(DEFAULT_ENDPOINT);

      if (availableModels.length === 0) {
        warn('未获取到模型列表，将使用预设模型');
        availableModels = [
          { id: 'claude-sonnet-4-5', name: 'Claude 4.5 Sonnet' },
          { id: 'claude-sonnet-4-5-thinking', name: 'Claude 4.5 Sonnet (Thinking)' },
          { id: 'claude-opus-4-5-thinking', name: 'Claude 4.5 Opus (Thinking)' },
          { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
          { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro High' },
          { id: 'gemini-3-pro-low', name: 'Gemini 3 Pro Low' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
          { id: 'gemini-2.5-flash-thinking', name: 'Gemini 2.5 Flash (Thinking)' },
        ];
      } else {
        success(`发现 ${availableModels.length} 个可用模型`);
      }

      // 5. 为每个智能体选择模型
      step('步骤 5/6: 配置智能体模型');
      log('  为每个智能体选择使用的模型', 'dim');
      log('  使用空格切换选中，/ 搜索，Enter 确认', 'dim');
      console.log('');

      // 让用户为每个智能体选择模型
      for (const agent of OMO_AGENT_ROLES) {
        // 找到推荐模型的索引
        const recommendedIndex = availableModels.findIndex(
          m => m.id.toLowerCase().includes(agent.recommended.toLowerCase())
        );
        const defaultIndex = recommendedIndex >= 0 ? recommendedIndex : 0;

        log(`  配置 ${agent.name}:`, 'cyan');
        log(`    推荐模型: ${agent.recommended}`, 'dim');

        const selectedModel = await showSelectList({
          title: `${agent.name} - 选择模型`,
          items: availableModels.map(m => ({
            label: m.name || m.id,
            value: m.id,
          })),
          defaultIndex,
        });

        if (selectedModel === null) {
          warn('配置已取消');
          return false;
        }

        agentModelAssignments[agent.id] = selectedModel;
        success(`  ${agent.name} → ${selectedModel}`);
      }
    }
  } else {
    warn('Antigravity Tools 端点不可用');
    log('  将使用默认模型配置', 'dim');
    log('  如需使用 Antigravity，请先运行 [A] Antigravity 配置', 'dim');
  }

  // 6. 确认功能配置
  const stepNum = useAntigravity ? '步骤 6/6' : '步骤 4/5';
  step(`${stepNum}: 确认功能配置`);
  log('  选择要启用的功能:', 'dim');
  console.log('');

  // 显示功能预览
  log('  即将启用的功能:', 'white');
  log('    ✓ Sisyphus 主智能体编排', 'green');
  log('    ✓ Oracle 战略分析智能体', 'green');
  log('    ✓ Librarian 文档研究智能体', 'green');
  log('    ✓ Frontend UI/UX 智能体', 'green');
  log('    ✓ Multimodal Looker 多模态智能体', 'green');
  log('    ✓ Explore 代码探索智能体', 'green');
  log('    ✓ Ralph Loop 持续执行 (100次迭代)', 'green');
  log('    ✓ Git Master 提交增强', 'green');
  console.log('');

  if (useAntigravity && Object.keys(agentModelAssignments).length > 0) {
    log('  智能体模型配置 (Antigravity):', 'cyan');
    for (const agent of OMO_AGENT_ROLES) {
      const model = agentModelAssignments[agent.id] || agent.recommended;
      const shortName = agent.name.split(' ')[0].padEnd(12);
      log(`    ${shortName} → ${model}`, 'dim');
    }
    console.log('');
  }

  const confirmInstall = await gridConfirm('确认安装并启用这些功能?', true);
  if (!confirmInstall) {
    warn('安装已取消');
    return false;
  }

  // 添加插件到 opencode.json
  step('安装插件');

  const config = readOpencodeConfig();

  if (!config.plugin) {
    config.plugin = [];
  }

  // 添加插件（如果不存在）
  if (!config.plugin.includes(OMO_PACKAGE)) {
    config.plugin.push(OMO_PACKAGE);
    success(`添加插件: ${OMO_PACKAGE}`);
  } else {
    log(`  插件已存在: ${OMO_PACKAGE}`, 'dim');
  }

  // 写入 opencode 配置
  const opencodeConfigPath = writeOpencodeConfig(config);
  success(`OpenCode 配置已保存: ${opencodeConfigPath}`);

  // 配置 oh-my-opencode.json
  const omoConfig = readOmoConfig();

  // 根据是否使用 Antigravity 配置智能体
  if (useAntigravity && Object.keys(agentModelAssignments).length > 0) {
    omoConfig.google_auth = false;
    omoConfig.agents = {};

    // 使用用户选择的模型配置
    for (const agent of OMO_AGENT_ROLES) {
      const model = agentModelAssignments[agent.id] || agent.recommended;
      omoConfig.agents[agent.id] = { model: `antigravity/${model}` };
    }

    log('  智能体模型已配置为使用 Antigravity 端点', 'cyan');
  }

  // 启用推荐功能
  omoConfig.sisyphus_agent = {
    disabled: false,
    planner_enabled: true,
    replace_plan: true,
  };

  omoConfig.ralph_loop = {
    enabled: true,
    default_max_iterations: 100,
  };

  omoConfig.git_master = {
    commit_footer: true,
    include_co_authored_by: true,
  };

  // 写入配置
  const omoConfigPath = writeOmoConfig(omoConfig);
  success(`插件配置已保存: ${omoConfigPath}`);

  // 完成提示
  console.log('');
  log(`${'═'.repeat(50)}`, 'green');
  log('  ✓ Oh My OpenCode 安装完成!', 'green');
  log(`${'═'.repeat(50)}`, 'green');
  console.log('');

  log('  已启用功能:', 'white');
  log('    ✓ Sisyphus 主智能体编排', 'green');
  log('    ✓ Oracle 战略分析智能体', 'green');
  log('    ✓ Librarian 文档研究智能体', 'green');
  log('    ✓ Frontend UI/UX 智能体', 'green');
  log('    ✓ Ralph Loop 持续执行', 'green');
  log('    ✓ Git Master 提交增强', 'green');
  log('    ✓ LSP/AST 工具增强', 'green');
  log('    ✓ 后台并行任务', 'green');
  console.log('');

  log('  配置文件:', 'white');
  log(`    OpenCode: ${opencodeConfigPath}`, 'dim');
  log(`    OMO: ${omoConfigPath}`, 'dim');
  console.log('');

  log('  使用方法:', 'yellow');
  log('    1. 启动 OpenCode: opencode', 'dim');
  log('    2. 使用 ultrawork 或 ulw 关键词触发完整功能', 'dim');
  log('    3. 使用 @oracle @librarian 等调用专业智能体', 'dim');
  console.log('');

  log('  更多信息:', 'yellow');
  log('    https://github.com/code-yeongyu/oh-my-opencode', 'dim');
  console.log('');

  return true;
}

/**
 * 主运行函数
 */
async function run(options = {}) {
  return await installOmo(options);
}

module.exports = {
  run,
  installOmo,
  isOmoInstalled,
  getOmoConfigPath,
  readOmoConfig,
  writeOmoConfig,
};

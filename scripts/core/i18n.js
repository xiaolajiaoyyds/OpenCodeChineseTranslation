/**
 * 汉化处理模块
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { getI18nDir, getOpencodeDir } = require("./utils.js");
const {
  step,
  success,
  error,
  warn,
  indent,
  info,
  blank,
  log,
  barPrefix,
  groupStart,
  groupEnd,
  l1,
  l3Info,
  l3Warn,
  l3Success,
} = require("./colors.js");
const Translator = require("./translator.js");

// TUI 源码目录（主要需要汉化的部分）
const TUI_DIR = "src/cli/cmd/tui";

class I18n {
  constructor() {
    this.i18nDir = getI18nDir();
    this.opencodeDir = getOpencodeDir();
    this.sourceBase = path.join(this.opencodeDir, "packages", "opencode");
    this.skipListPath = path.join(this.i18nDir, "skip-files.json");
    this.translator = new Translator();
  }

  /**
   * 加载跳过列表
   */
  loadSkipList() {
    if (!fs.existsSync(this.skipListPath)) {
      return { files: [], reasons: {} };
    }
    try {
      return JSON.parse(fs.readFileSync(this.skipListPath, "utf-8"));
    } catch {
      return { files: [], reasons: {} };
    }
  }

  /**
   * 保存跳过列表
   */
  saveSkipList(skipList) {
    fs.writeFileSync(this.skipListPath, JSON.stringify(skipList, null, 2));
  }

  /**
   * 添加文件到跳过列表
   */
  addToSkipList(file, reason) {
    const skipList = this.loadSkipList();
    if (!skipList.files.includes(file)) {
      skipList.files.push(file);
      skipList.reasons[file] = reason;
      this.saveSkipList(skipList);
    }
  }

  /**
   * 读取所有汉化配置文件（递归扫描子目录）
   */
  loadConfig() {
    if (!fs.existsSync(this.i18nDir)) {
      throw new Error(`汉化配置目录不存在: ${this.i18nDir}`);
    }

    const configs = [];
    const jsonFiles = glob.sync("**/*.json", {
      cwd: this.i18nDir,
      ignore: ["skip-files.json", "config.json"],
    });

    for (const file of jsonFiles) {
      const filePath = path.join(this.i18nDir, file);
      const category = file.split("/")[0];

      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        configs.push({
          category,
          fileName: path.basename(file),
          configPath: filePath,
          ...content,
        });
      } catch (err) {
        warn(`跳过无效配置 ${filePath}: ${err.message}`);
      }
    }

    return configs;
  }

  /**
   * 获取 TUI 源码中所有需要汉化的文件
   */
  getTuiSourceFiles() {
    const tuiPath = path.join(this.sourceBase, TUI_DIR);
    if (!fs.existsSync(tuiPath)) {
      return [];
    }

    const files = glob.sync("**/*.tsx", { cwd: tuiPath });
    return files.map((f) => path.join(TUI_DIR, f));
  }

  /**
   * 获取已配置汉化的文件列表
   */
  getConfiguredFiles() {
    const configs = this.loadConfig();
    const files = new Set();

    for (const config of configs) {
      if (config.file) {
        files.add(config.file);
      }
    }

    return files;
  }

  /**
   * 检测新增的未汉化文件（排除已跳过的）
   */
  detectNewFiles() {
    const sourceFiles = this.getTuiSourceFiles();
    const configuredFiles = this.getConfiguredFiles();
    const skipList = this.loadSkipList();

    const newFiles = [];
    for (const file of sourceFiles) {
      if (!configuredFiles.has(file) && !skipList.files.includes(file)) {
        const fullPath = path.join(this.sourceBase, file);
        if (this.hasTranslatableText(fullPath)) {
          newFiles.push(file);
        }
      }
    }

    return newFiles;
  }

  /**
   * AI 检查文件是否需要翻译，返回 { needsTranslation, reason, translations }
   */
  async aiCheckFile(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(this.sourceBase, filePath);

    const prompt = `分析以下 React/TSX 文件，判断是否包含需要翻译成中文的用户可见文本。

文件路径: ${relativePath}

\`\`\`tsx
${content}
\`\`\`

请回答：
1. 是否需要翻译？（是/否）
2. 原因（简短说明）
3. 如果需要翻译，列出需要翻译的文本（JSON 格式）

回复格式（严格 JSON）：
{"needsTranslation": true/false, "reason": "原因", "translations": [{"original": "英文", "translated": "中文"}]}

注意：
- 技术术语（LSP、MCP、API 等）不需要翻译
- 命令（/connect、/status 等）不需要翻译
- 只翻译用户可见的 UI 文本`;

    try {
      const result = await this.translator.simpleCallAI(prompt);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      warn(`AI 检查失败: ${e.message}`);
    }
    return null;
  }

  /**
   * 智能处理新文件：AI 检查 → 自动翻译或跳过
   */
  async smartProcessNewFiles(newFiles, options = {}) {
    const { silent = false, dryRun = false } = options;
    if (newFiles.length === 0) {
      return {
        processed: 0,
        translatedFiles: 0,
        translatedEntries: 0,
        skippedFiles: 0,
        failedFiles: 0,
        savedConfigs: [],
        skipped: [],
      };
    }

    if (!silent) info(`正在用 AI 分析 ${newFiles.length} 个新文件...`);

    const stats = {
      processed: 0,
      translatedFiles: 0,
      translatedEntries: 0,
      skippedFiles: 0,
      failedFiles: 0,
      savedConfigs: [],
      skipped: [],
    };

    for (const file of newFiles) {
      const fullPath = path.join(this.sourceBase, file);
      stats.processed++;
      if (!silent) indent(`检查: ${file}`, 2);

      const result = await this.aiCheckFile(fullPath);
      if (!result) {
        stats.failedFiles++;
        if (!silent) indent(`  ⚠ AI 分析失败，保留待处理`, 2);
        continue;
      }

      if (result.needsTranslation && result.translations?.length > 0) {
        const category = this.getCategoryFromPath(file);
        const configPath = this.generateConfigPath(file, category);

        // 转换为 replacements 对象格式
        const replacements = {};
        for (const t of result.translations) {
          replacements[t.original] = t.translated;
        }

        const config = {
          file: file,
          category: category,
          replacements: replacements,
        };

        stats.translatedFiles++;
        stats.translatedEntries += result.translations.length;
        stats.savedConfigs.push({
          file,
          configPath,
          count: result.translations.length,
        });

        if (!dryRun) {
          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }

        if (!silent) {
          success(
            dryRun
              ? `  ✓ (dry-run) 将保存翻译: ${result.translations.length} 条`
              : `  ✓ 已保存翻译: ${result.translations.length} 条`,
          );
          indent(`    配置: ${configPath}`, 2);
        }
      } else {
        // 不需要翻译 → 加入跳过列表
        stats.skippedFiles++;
        stats.skipped.push({ file, reason: result.reason || "无需翻译的文本" });
        if (!dryRun)
          this.addToSkipList(file, result.reason || "无需翻译的文本");
        if (!silent) info(`  ○ 已跳过: ${result.reason}`);
      }
    }

    return stats;
  }

  /**
   * 从文件路径推断分类
   */
  getCategoryFromPath(filePath) {
    if (filePath.includes("/component/")) return "组件";
    if (filePath.includes("/routes/")) return "路由";
    if (filePath.includes("/context/")) return "上下文";
    if (filePath.includes("/dialog")) return "对话框";
    return "通用";
  }

  /**
   * 生成配置文件路径
   */
  generateConfigPath(filePath, category) {
    const fileName = path.basename(filePath, path.extname(filePath)) + ".json";
    const categoryDirMap = {
      组件: "components",
      路由: "routes",
      上下文: "contexts",
      对话框: "dialogs",
      通用: "common",
    };
    const categoryDir = categoryDirMap[category] || "common";

    // 提取子目录（去掉 src/cli/cmd/tui/ 前缀）
    let subDir = path.dirname(filePath).replace(/^src\/cli\/cmd\/tui\/?/, "");

    // 避免重复目录：如果 subDir 以 categoryDir 对应的目录开头，跳过 categoryDir
    const firstPart = subDir.split("/")[0];
    const skipCategory = Object.values(categoryDirMap).includes(firstPart);

    if (subDir && subDir !== ".") {
      if (skipCategory) {
        return path.join(this.i18nDir, subDir, fileName);
      }
      return path.join(this.i18nDir, categoryDir, subDir, fileName);
    }
    return path.join(this.i18nDir, categoryDir, fileName);
  }

  /**
   * 检查文件是否包含可翻译的文本
   */
  hasTranslatableText(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // 排除纯 context/helper 文件（通常只有代码逻辑）
      if (
        filePath.includes("/context/") &&
        !content.includes("<text") &&
        !content.includes("<box")
      ) {
        // context 文件如果没有 UI 组件，通常不需要汉化
        // 但如果有用户可见的字符串还是要检测
        const hasVisibleString =
          /["'](Connect|Select|Enter|Add|No |Please|Error|Warning|Success|Failed)/i.test(
            content,
          );
        if (!hasVisibleString) return false;
      }

      // 检查是否有英文字符串（排除纯代码文件）
      const patterns = [
        /title="[A-Z][a-z]{2,}/, // title="Something" (至少3个字母)
        /label="[A-Z][a-z]{2,}/, // label="Something"
        /placeholder="[A-Z][a-z]{2,}/, // placeholder="Something"
        /description="[A-Z][a-z]{2,}/, // description="Something"
        />\s*[A-Z][a-z]{3,}[^<]*</, // >Some text< (至少4个字母的文本)
        /"[A-Z][a-z].*\{highlight\}/, // Tips 格式
        /message:\s*["'][A-Z][a-z]/, // message: "Something"
        /text:\s*["'][A-Z][a-z]/, // text: "Something"
      ];

      return patterns.some((p) => p.test(content));
    } catch {
      return false;
    }
  }

  /**
   * 检测源码中未被汉化的英文文本
   */
  detectMissingTranslations() {
    const configs = this.loadConfig();
    const missing = [];

    for (const config of configs) {
      if (!config.file || !config.replacements) continue;

      const fullPath = path.join(this.sourceBase, config.file);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");

      // 检查常见的未汉化模式
      const patterns = [
        { regex: /title="([A-Z][a-z][^"]+)"/g, type: "title" },
        { regex: /label="([A-Z][a-z][^"]+)"/g, type: "label" },
        { regex: /placeholder="([A-Z][a-z][^"]+)"/g, type: "placeholder" },
      ];

      for (const { regex, type } of patterns) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const text = match[1];
          // 检查是否已有对应的汉化（简单检查是否包含中文）
          if (!/[\u4e00-\u9fa5]/.test(text)) {
            // 检查是否在 replacements 中
            const key = `${type}="${text}"`;
            if (!config.replacements[key] && !config.replacements[match[0]]) {
              missing.push({
                file: config.file,
                type,
                text,
                full: match[0],
              });
            }
          }
        }
      }
    }

    return missing;
  }

  /**
   * 应用单个配置文件的替换规则
   */
  applyConfig(config) {
    if (!config.file || !config.replacements) {
      return { files: 0, replacements: 0 };
    }

    let relativePath = config.file;
    if (!relativePath.startsWith("packages/")) {
      relativePath = path.join("packages/opencode", relativePath);
    }

    const targetPath = path.join(this.opencodeDir, relativePath);

    if (!fs.existsSync(targetPath)) {
      return { files: 0, replacements: 0 };
    }

    let content = fs.readFileSync(targetPath, "utf-8");
    content = content.replace(/\r\n/g, "\n");
    let replaceCount = 0;
    const originalContent = content;

    for (const [find, replace] of Object.entries(config.replacements)) {
      const normalizedFind = find.replace(/\r\n/g, "\n");
      const normalizedReplace = replace.replace(/\r\n/g, "\n");

      // 防止重复替换：如果内容已经包含翻译结果，跳过
      if (content.includes(normalizedReplace)) {
        continue;
      }

      const isSimpleWord = /^[a-zA-Z0-9]+$/.test(normalizedFind);

      if (isSimpleWord) {
        const wordBoundaryPattern = new RegExp(`\\b${normalizedFind}\\b`, "g");
        if (wordBoundaryPattern.test(content)) {
          content = content.replace(wordBoundaryPattern, normalizedReplace);
          replaceCount++;
        }
      } else {
        if (content.includes(normalizedFind)) {
          content = content.replaceAll(normalizedFind, normalizedReplace);
          replaceCount++;
        }
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(targetPath, content, "utf-8");
    }

    return { files: 1, replacements: replaceCount, file: config.file };
  }

  /**
   * 应用所有汉化配置（带新文件检测）
   */
  async apply(options = {}) {
    const { silent = false, skipNewFileCheck = false } = options;

    // 1. 检测新增文件（可跳过，由外部调用）
    let newFiles = [];
    if (!skipNewFileCheck) {
      newFiles = this.detectNewFiles();
      if (newFiles.length > 0) {
        info(`发现 ${newFiles.length} 个新文件，正在 AI 分析...`);
        await this.smartProcessNewFiles(newFiles);
        blank();
      } else if (!silent) {
        success("没有新增需要汉化的文件");
      }
    }

    // 2. 应用汉化

    const configs = this.loadConfig();

    if (configs.length === 0) {
      throw new Error("未找到任何汉化配置文件");
    }

    if (!silent) {
      indent(`找到 ${configs.length} 个配置文件`, 2);
    }

    let totalFiles = 0;
    let totalReplacements = 0;
    const appliedFiles = [];

    for (const config of configs) {
      const result = this.applyConfig(config);
      if (result.replacements > 0) {
        totalFiles += result.files;
        totalReplacements += result.replacements;
        appliedFiles.push({ file: result.file, count: result.replacements });
      }
    }

    if (!silent && appliedFiles.length > 0) {
      const maxShow = 3;
      appliedFiles.slice(0, maxShow).forEach((f) => {
        indent(`✓ ${f.file} (${f.count} 处替换)`, 2);
      });
      if (appliedFiles.length > maxShow) {
        indent(`... 还有 ${appliedFiles.length - maxShow} 个文件`, 2);
      }
      success(
        `汉化应用完成: ${totalFiles} 个文件, ${totalReplacements} 处替换`,
      );
    } else if (!silent) {
      success("无需替换，所有文本已是中文");
    }

    return {
      files: totalFiles,
      replacements: totalReplacements,
      newFiles,
    };
  }

  /**
   * 验证配置完整性
   */
  validate() {
    const configs = this.loadConfig();
    const errors = [];
    const canCheckTargets = fs.existsSync(this.sourceBase);

    for (const config of configs) {
      if (!config.file) {
        errors.push(`${config.category}/${config.fileName}: 缺少 file 字段`);
        continue;
      }

      if (canCheckTargets) {
        if (config.deprecated === true) {
          continue;
        }
        const targetPath = path.join(this.sourceBase, config.file);
        if (!fs.existsSync(targetPath)) {
          errors.push(
            `${config.category}/${config.fileName}: 目标文件不存在: ${config.file}`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * 获取汉化统计信息
   */
  getStats() {
    const configs = this.loadConfig();
    const stats = {
      totalConfigs: configs.length,
      categories: {},
      totalReplacements: 0,
    };

    for (const config of configs) {
      const category = config.category;
      if (!stats.categories[category]) {
        stats.categories[category] = { count: 0, replacements: 0 };
      }
      stats.categories[category].count++;
      if (config.replacements) {
        const count = Object.keys(config.replacements).length;
        stats.categories[category].replacements += count;
        stats.totalReplacements += count;
      }
    }

    return stats;
  }

  /**
   * 快速分析文件，判断是否包含可翻译的 UI 文本
   */
  analyzeFile(filePath) {
    const fullPath = path.join(this.sourceBase, filePath);
    if (!fs.existsSync(fullPath)) {
      return { hasUIText: false, reason: "文件不存在" };
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n").length;

    // 检查是否有 JSX 返回（UI 组件的标志）
    const hasJSX =
      /<[A-Z][a-zA-Z]*/.test(content) || /return\s*\(?\s*</.test(content);

    // 检查是否有可翻译的文本模式
    const patterns = [
      />([A-Z][a-zA-Z\s]{3,})</, // JSX 文本
      /(title|label|placeholder|message)=["'][A-Z]/, // 属性文本
      /(title|label|message):\s*["'][A-Z]/, // 对象属性
    ];

    let foundTexts = 0;
    for (const pattern of patterns) {
      const matches = content.match(new RegExp(pattern.source, "g"));
      if (matches) foundTexts += matches.length;
    }

    // 判断文件类型
    if (!hasJSX && foundTexts === 0) {
      // 纯逻辑文件
      if (/export\s+(const|function|class)\s+\w+Context/.test(content)) {
        return { hasUIText: false, reason: "Context 逻辑", type: "context" };
      }
      if (/type\s+\w+\s*=|interface\s+\w+/.test(content) && lines < 100) {
        return { hasUIText: false, reason: "类型定义", type: "types" };
      }
      if (/export\s+\{/.test(content) && lines < 30) {
        return { hasUIText: false, reason: "导出索引", type: "index" };
      }
      return { hasUIText: false, reason: "纯逻辑代码", type: "logic" };
    }

    if (foundTexts === 0 && hasJSX) {
      // 有 JSX 但没有检测到文本
      return { hasUIText: false, reason: "无固定文本", type: "dynamic" };
    }

    // 有可翻译的文本
    return {
      hasUIText: true,
      textCount: foundTexts,
      reason: "需要翻译",
      type: "ui",
    };
  }

  /**
   * 检查废弃的翻译配置
   */
  checkObsoleteTranslations() {
    const configs = this.loadConfig();
    const sourceFiles = new Set(this.getTuiSourceFiles());
    const obsolete = [];

    for (const config of configs) {
      // 检查文件是否存在
      const fullPath = path.join(this.sourceBase, config.file);
      if (!fs.existsSync(fullPath)) {
        obsolete.push({
          file: config.file,
          configPath: config.configPath,
          reason: "源码文件已删除",
          type: "file_missing",
        });
        continue;
      }

      // 检查是否还在源码列表中（可能是被移动了）
      if (!sourceFiles.has(config.file)) {
        obsolete.push({
          file: config.file,
          configPath: config.configPath,
          reason: "文件不再属于 TUI 源码范围",
          type: "out_of_scope",
        });
      }
    }

    return obsolete;
  }

  /**
   * 删除废弃的翻译配置
   */
  removeObsoleteTranslations(obsoleteList) {
    let removed = 0;
    for (const item of obsoleteList) {
      if (item.configPath && fs.existsSync(item.configPath)) {
        fs.unlinkSync(item.configPath);
        removed++;
      }
    }
    return removed;
  }

  /**
   * 获取汉化覆盖率统计
   */
  getCoverageStats() {
    const configs = this.loadConfig();
    const sourceFiles = this.getTuiSourceFiles();
    const configuredFiles = this.getConfiguredFiles();

    // 统计各分类
    const categories = {};
    let totalReplacements = 0;

    for (const config of configs) {
      const cat = config.category;
      if (!categories[cat]) {
        categories[cat] = { files: 0, replacements: 0 };
      }
      categories[cat].files++;
      if (config.replacements) {
        const count = Object.keys(config.replacements).length;
        categories[cat].replacements += count;
        totalReplacements += count;
      }
    }

    // 分析未配置的文件
    const coveredFiles = sourceFiles.filter((f) =>
      configuredFiles.has(f),
    ).length;
    const uncoveredFiles = sourceFiles.filter((f) => !configuredFiles.has(f));
    const uncoveredAnalysis = uncoveredFiles.map((f) => ({
      file: f,
      ...this.analyzeFile(f),
    }));

    // 分类：需要翻译 vs 不需要翻译
    const needTranslate = uncoveredAnalysis.filter((f) => f.hasUIText);
    const noNeedTranslate = uncoveredAnalysis.filter((f) => !f.hasUIText);

    // 计算真实覆盖率：有配置 + 不需要翻译 = 已完成
    const effectivelyCovered = coveredFiles + noNeedTranslate.length;
    const fileCoverage =
      sourceFiles.length > 0
        ? (effectivelyCovered / sourceFiles.length) * 100
        : 100;

    return {
      files: {
        total: sourceFiles.length,
        covered: effectivelyCovered,
        configuredFiles: coveredFiles,
        skippedFiles: noNeedTranslate.length,
        uncovered: needTranslate.length,
        coverage: fileCoverage,
        uncoveredList: needTranslate.map((f) => f.file),
      },
      translations: {
        total: totalReplacements,
        configs: configs.length,
      },
      categories,
      uncoveredAnalysis: {
        needTranslate,
        noNeedTranslate,
      },
    };
  }

  /**
   * 显示汉化覆盖率报告
   */
  showCoverageReport() {
    const stats = this.getCoverageStats();
    const { colors } = require("./colors.js");
    const c = colors;

    groupStart("汉化覆盖率");

    const barWidth = 24;
    const filled = Math.round((stats.files.coverage / 100) * barWidth);
    const empty = barWidth - filled;

    const coverageColor =
      stats.files.coverage >= 95
        ? c.green
        : stats.files.coverage >= 80
          ? c.yellow
          : c.red;

    const pct = stats.files.coverage.toFixed(1);

    blank();
    l1(
      `${coverageColor}${c.bold}${pct}%${c.reset}  ${c.gray}${"▓".repeat(filled)}${"░".repeat(empty)}${c.reset}`,
    );
    blank();
    l1(
      `${c.cyan}文件${c.reset} ${stats.files.configuredFiles}/${stats.files.total}    ${c.cyan}翻译${c.reset} ${stats.translations.total} 条`,
    );
    blank();

    const categoryInfo = {
      dialogs: { emoji: "💬", name: "对话框" },
      components: { emoji: "🧩", name: "组件  " },
      routes: { emoji: "🛣️", name: "路由  " },
      common: { emoji: "📦", name: "通用  " },
      contexts: { emoji: "⚙️", name: "上下文" },
    };

    for (const [cat, info] of Object.entries(categoryInfo)) {
      const data = stats.categories[cat];
      if (data) {
        l1(
          `${info.emoji} ${c.dim}${info.name}${c.reset}  ${data.files} 文件 / ${data.replacements} 条`,
        );
      }
    }

    if (stats.files.uncovered > 0) {
      const { needTranslate, noNeedTranslate } = stats.uncoveredAnalysis;

      if (needTranslate.length > 0) {
        blank();
        l1(`${c.yellow}⚠ 待翻译 ${needTranslate.length} 个文件${c.reset}`);
        needTranslate.slice(0, 3).forEach((f) => {
          const shortPath = f.file.replace("src/cli/cmd/tui/", "");
          l3Info(`→ ${shortPath}`);
        });
        if (needTranslate.length > 3) {
          l3Info(`... 还有 ${needTranslate.length - 3} 个`);
        }
      }

      if (noNeedTranslate.length > 0) {
        blank();
        l1(
          `${c.dim}○ 跳过 ${noNeedTranslate.length} 个文件（无 UI 文本）${c.reset}`,
        );
      }
    }

    if (stats.files.coverage >= 100) {
      blank();
      l1(`${c.green}✓ 所有文件都已覆盖！${c.reset}`);
    }

    groupEnd();

    return stats;
  }

  /**
   * 显示汉化覆盖率报告
   * AI 总结已移至执行总结框内，不再单独显示
   * @param {Object} newTranslations - 本次新翻译的内容（可选）
   */
  async showCoverageReportWithAI(newTranslations = null) {
    const stats = this.showCoverageReport();

    // 显示本次新增翻译
    if (
      newTranslations &&
      newTranslations.files &&
      newTranslations.files.length > 0
    ) {
      blank();
      indent(`✨ 本次新增翻译:`);

      for (const fileResult of newTranslations.files.slice(0, 5)) {
        const shortPath = fileResult.file.replace("src/cli/cmd/tui/", "");
        const count = Object.keys(fileResult.translations).length;
        indent(`  + ${shortPath} (${count} 条)`);
      }

      if (newTranslations.files.length > 5) {
        indent(`  ... 还有 ${newTranslations.files.length - 5} 个文件`);
      }
    }

    // AI 总结已移至执行总结框内，在此返回统计数据供后续使用
    return stats;
  }
}

module.exports = I18n;

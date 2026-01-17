/**
 * AI 翻译模块
 * 扫描源码 → 提取未翻译文本 → AI翻译 → 写入语言包
 * 
 * 特性：
 * - 智能扫描：自动识别需要翻译的 UI 文本
 * - 翻译缓存：避免重复调用 API，节省费用
 * - 双语格式：输出 "中文 (English)" 格式
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { glob } = require('glob');
const { step, success, error, warn, indent, log } = require('./colors.js');
const { getI18nDir, getOpencodeDir, getProjectDir } = require('./utils.js');

class Translator {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.i18nDir = getI18nDir();
    this.opencodeDir = getOpencodeDir();
    this.sourceBase = path.join(this.opencodeDir, 'packages', 'opencode');
    
    // 缓存配置
    this.cacheFile = path.join(getProjectDir(), '.translation-cache.json');
    this.cache = this.loadCache();
  }

  /**
   * 生成文本的唯一 hash（用于缓存 key）
   */
  hashText(text) {
    return crypto.createHash('md5').update(text).digest('hex').substring(0, 12);
  }

  /**
   * 加载翻译缓存
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (e) {
      // 缓存文件损坏，重新创建
    }
    return { version: 1, translations: {} };
  }

  /**
   * 保存翻译缓存
   */
  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      // 保存失败不影响主流程
    }
  }

  /**
   * 从缓存获取翻译
   */
  getFromCache(text) {
    const hash = this.hashText(text);
    return this.cache.translations[hash];
  }

  /**
   * 写入缓存
   */
  setCache(text, translation) {
    const hash = this.hashText(text);
    this.cache.translations[hash] = translation;
  }

  /**
   * 检查 API 配置
   */
  checkConfig() {
    if (!this.apiKey) {
      error('未配置 OPENAI_API_KEY，请在项目根目录创建 .env 文件');
      indent('示例: OPENAI_API_KEY=sk-your-api-key', 2);
      return false;
    }
    return true;
  }

  /**
   * 加载已有的语言包配置
   */
  loadExistingTranslations() {
    const translations = new Map(); // file -> { original -> translated }

    if (!fs.existsSync(this.i18nDir)) {
      return translations;
    }

    const categories = ['dialogs', 'routes', 'components', 'common', 'contexts'];
    
    for (const category of categories) {
      const categoryDir = path.join(this.i18nDir, category);
      if (!fs.existsSync(categoryDir)) continue;

      const jsonFiles = glob.sync('*.json', { cwd: categoryDir });
      
      for (const file of jsonFiles) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(categoryDir, file), 'utf-8'));
          if (content.file && content.replacements) {
            if (!translations.has(content.file)) {
              translations.set(content.file, new Map());
            }
            const fileMap = translations.get(content.file);
            for (const [original, translated] of Object.entries(content.replacements)) {
              fileMap.set(original, translated);
            }
          }
        } catch (e) {
          // 跳过无效文件
        }
      }
    }

    return translations;
  }

  /**
   * 扫描源码文件，提取需要翻译的文本
   */
  scanSourceFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const texts = [];

    // 匹配模式：提取需要翻译的文本
    const patterns = [
      // 字符串属性：title="Text" / label="Text" / placeholder="Text"
      { 
        regex: /(title|label|placeholder|description|message|category)=["']([A-Z][^"']*?)["']/g, 
        extract: (m) => ({ original: m[0], text: m[2], type: 'attr' })
      },
      // JSX 文本内容：>Text< （至少4个字符，首字母大写）
      { 
        regex: />([A-Z][a-zA-Z\s]{3,}[^<]*?)</g, 
        extract: (m) => ({ original: m[0], text: m[1].trim(), type: 'jsx' })
      },
      // 对象属性：title: "Text" / category: "Text"
      { 
        regex: /(title|label|message|description|category):\s*["']([A-Z][^"']*?)["']/g, 
        extract: (m) => ({ original: m[0], text: m[2], type: 'prop' })
      },
      // return 语句中的字符串
      {
        regex: /return\s+["']([A-Z][^"']*?)["']/g,
        extract: (m) => ({ original: m[0], text: m[1], type: 'return' })
      },
      // 长字符串（用于 tips 等）
      {
        regex: /"([A-Z][^"]{20,})"/g,
        extract: (m) => ({ original: `"${m[1]}"`, text: m[1], type: 'string' })
      }
    ];

    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const extracted = pattern.extract(match);
        
        // 过滤条件
        if (!extracted.text || extracted.text.length < 2) continue;
        if (/[\u4e00-\u9fa5]/.test(extracted.text)) continue; // 已有中文
        if (/^[A-Z_]+$/.test(extracted.text)) continue; // 全大写常量
        if (/^[A-Z][a-z]+[A-Z]/.test(extracted.text) && extracted.text.length < 10) continue; // 短驼峰
        if (/^(true|false|null|undefined)$/i.test(extracted.text)) continue;
        if (/^\$\{/.test(extracted.text)) continue; // 模板变量
        if (/^https?:\/\//.test(extracted.text)) continue; // URL
        if (/^#[0-9a-fA-F]+$/.test(extracted.text)) continue; // 颜色值
        if (/^[a-z_]+$/.test(extracted.text)) continue; // 纯小写标识符
        // 已是双语格式：xxx (English) 或 xxx（中文）
        if (/\([A-Z][^)]+\)\s*$/.test(extracted.text)) continue;

        texts.push(extracted);
      }
    }

    // 去重
    const seen = new Set();
    return texts.filter(t => {
      if (seen.has(t.original)) return false;
      seen.add(t.original);
      return true;
    });
  }

  /**
   * 扫描所有源码，找出未翻译的文本
   */
  scanAllFiles() {
    const existingTranslations = this.loadExistingTranslations();
    const untranslated = new Map(); // file -> [{ original, text }]

    const tuiDir = path.join(this.sourceBase, 'src/cli/cmd/tui');
    if (!fs.existsSync(tuiDir)) {
      return untranslated;
    }

    const files = glob.sync('**/*.tsx', { cwd: tuiDir });

    for (const file of files) {
      const relativePath = `src/cli/cmd/tui/${file}`;
      const fullPath = path.join(tuiDir, file);
      
      const texts = this.scanSourceFile(fullPath);
      const fileTranslations = existingTranslations.get(relativePath) || new Map();

      // 找出未翻译的文本
      // 检查：1) exact match 2) 文本本身是否在任意 key 中存在
      const missing = texts.filter(t => {
        // 直接匹配 original
        if (fileTranslations.has(t.original)) return false;
        
        // 检查文本是否已在其他格式的 key 中存在
        for (const key of fileTranslations.keys()) {
          if (key.includes(t.text)) return false;
        }
        
        return true;
      });

      if (missing.length > 0) {
        untranslated.set(relativePath, missing);
      }
    }

    return untranslated;
  }

  /**
   * 调用 AI 翻译
   */
  async callAI(texts, fileName) {
    const prompt = `请将以下英文 UI 文本翻译成中文。

**翻译规则：**
1. 输出格式：中文翻译 (English original)
2. 例如："Help" → "帮助 (Help)"
3. 保持专业术语准确：Session=会话, Model=模型, Agent=代理/智能体, Provider=提供商
4. UI 文本要口语化自然
5. 保留变量和代码部分不翻译，如 {highlight}, {keybind.print(...)}
6. 快捷键保持英文：Ctrl+X, Enter, Escape

**待翻译文本（来自 ${fileName}）：**
${texts.map((t, i) => `${i + 1}. "${t.text}"`).join('\n')}

**输出格式（JSON）：**
严格输出 JSON，key 是原文，value 是 "中文 (English)" 格式：
\`\`\`json
{
  "原文1": "中文翻译1 (原文1)",
  "原文2": "中文翻译2 (原文2)"
}
\`\`\``;

    const requestData = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    };

    // Thinking 模型不设置 max_tokens
    if (!this.model.includes('thinking')) {
      requestData.max_tokens = 4000;
    }

    const requestBody = JSON.stringify(requestData);

    return new Promise((resolve, reject) => {
      const baseUrl = this.apiBase.endsWith('/') ? this.apiBase.slice(0, -1) : this.apiBase;
      const fullUrl = `${baseUrl}/chat/completions`;
      const url = new URL(fullUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (!data || data.trim().length === 0) {
              reject(new Error(`API 返回空数据，状态码: ${res.statusCode}`));
              return;
            }

            const response = JSON.parse(data);

            if (response.error) {
              reject(new Error(response.error.message));
              return;
            }

            if (!response.choices || response.choices.length === 0) {
              reject(new Error('API 返回空响应'));
              return;
            }

            resolve(response.choices[0].message.content.trim());
          } catch (err) {
            reject(new Error(`解析响应失败: ${err.message}`));
          }
        });
      });

      req.on('error', err => reject(new Error(`请求失败: ${err.message}`)));
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * 解析 AI 返回的翻译结果
   */
  parseTranslations(response, originalTexts) {
    // 提取 JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      throw new Error('响应中未找到 JSON 数据');
    }

    const translations = JSON.parse(jsonMatch[1]);
    const result = {};

    for (const item of originalTexts) {
      const translated = translations[item.text];
      if (translated) {
        // 构建完整的替换规则
        result[item.original] = item.original.replace(item.text, translated);
      }
    }

    return result;
  }

  /**
   * 智能分类文件
   */
  categorizeFile(filePath) {
    const normalized = filePath.toLowerCase();
    
    if (normalized.includes('/ui/dialog') || normalized.includes('/component/dialog')) {
      return 'dialogs';
    }
    if (normalized.includes('/routes/')) {
      return 'routes';
    }
    if (normalized.includes('/component/')) {
      return 'components';
    }
    if (normalized.includes('/context/')) {
      return 'contexts';
    }
    
    return 'common';
  }

  /**
   * 生成配置文件名
   */
  generateConfigFileName(filePath) {
    const baseName = path.basename(filePath, '.tsx');
    return `${baseName}.json`;
  }

  /**
   * 更新或创建语言包文件
   */
  updateLanguagePack(filePath, newTranslations) {
    const category = this.categorizeFile(filePath);
    const fileName = this.generateConfigFileName(filePath);
    
    const categoryDir = path.join(this.i18nDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const configPath = path.join(categoryDir, fileName);
    
    // 读取现有配置
    let config = {
      file: filePath,
      description: `${path.basename(filePath)} 汉化配置`,
      replacements: {}
    };

    if (fs.existsSync(configPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = existing;
      } catch (e) {
        // 使用默认配置
      }
    }

    // 合并新翻译
    config.replacements = { ...config.replacements, ...newTranslations };

    // 写入文件
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    return { category, fileName, path: configPath, count: Object.keys(newTranslations).length };
  }

  /**
   * 翻译单个文件的未翻译文本（支持缓存）
   */
  async translateFile(filePath, untranslatedTexts) {
    const fileName = path.basename(filePath);
    step(`翻译 ${fileName}`);

    if (untranslatedTexts.length === 0) {
      success('无需翻译');
      return null;
    }

    log(`发现 ${untranslatedTexts.length} 处未翻译文本`);

    // 分离缓存命中和需要翻译的文本
    const cachedTranslations = {};
    const needTranslate = [];
    let cacheHits = 0;

    for (const item of untranslatedTexts) {
      const cached = this.getFromCache(item.text);
      if (cached) {
        // 缓存命中，直接使用
        cachedTranslations[item.original] = item.original.replace(item.text, cached);
        cacheHits++;
      } else {
        needTranslate.push(item);
      }
    }

    if (cacheHits > 0) {
      log(`缓存命中 ${cacheHits} 处`);
    }

    let aiTranslations = {};

    // 仍有需要翻译的文本
    if (needTranslate.length > 0) {
      log(`需要 AI 翻译 ${needTranslate.length} 处`);

      try {
        // 调用 AI 翻译
        const response = await this.callAI(needTranslate, fileName);
        
        // 解析翻译结果
        aiTranslations = this.parseTranslations(response, needTranslate);

        // 写入缓存
        for (const item of needTranslate) {
          const translated = aiTranslations[item.original];
          if (translated) {
            // 提取翻译后的文本（去掉原格式）
            const translatedText = translated.replace(item.original.replace(item.text, ''), '');
            // 从 "title: \"中文 (English)\"" 中提取 "中文 (English)"
            const match = translated.match(/["']([^"']+)["']/);
            if (match) {
              this.setCache(item.text, match[1]);
            }
          }
        }
        this.saveCache();

      } catch (err) {
        error(`AI 翻译失败: ${err.message}`);
        // 即使 AI 翻译失败，也返回缓存的结果
        if (cacheHits === 0) {
          return null;
        }
      }
    }

    // 合并缓存和 AI 翻译结果
    const translations = { ...cachedTranslations, ...aiTranslations };
    const translatedCount = Object.keys(translations).length;

    if (translatedCount === 0) {
      warn('未能成功翻译任何文本');
      return null;
    }

    // 更新语言包
    const saved = this.updateLanguagePack(filePath, translations);
    
    const stats = [];
    if (cacheHits > 0) stats.push(`${cacheHits} 缓存`);
    if (Object.keys(aiTranslations).length > 0) stats.push(`${Object.keys(aiTranslations).length} AI翻译`);
    
    success(`成功翻译 ${translatedCount} 处 (${stats.join(', ')})，已写入 ${saved.category}/${saved.fileName}`);
    
    return {
      file: filePath,
      translations,
      saved,
      stats: { cacheHits, aiTranslated: Object.keys(aiTranslations).length }
    };
  }

  /**
   * 扫描并翻译所有未翻译的文本
   */
  async scanAndTranslate(options = {}) {
    const { dryRun = false } = options;

    if (!this.checkConfig()) {
      return { success: false, files: [] };
    }

    // 1. 扫描所有文件
    step('扫描源码，检测未翻译文本');
    const untranslated = this.scanAllFiles();

    if (untranslated.size === 0) {
      success('所有文本已翻译，无需处理');
      return { success: true, files: [], totalTexts: 0 };
    }

    // 统计
    let totalTexts = 0;
    for (const texts of untranslated.values()) {
      totalTexts += texts.length;
    }

    warn(`发现 ${untranslated.size} 个文件共 ${totalTexts} 处未翻译文本`);
    console.log('');

    if (dryRun) {
      // 仅显示，不翻译
      for (const [file, texts] of untranslated) {
        indent(`${file} (${texts.length} 处)`, 2);
        texts.slice(0, 3).forEach(t => indent(`  - "${t.text.substring(0, 40)}..."`, 2));
        if (texts.length > 3) {
          indent(`  ... 还有 ${texts.length - 3} 处`, 2);
        }
      }
      return { success: true, files: [], totalTexts, dryRun: true };
    }

    // 2. 逐个文件翻译
    step('AI 翻译并写入语言包');
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let totalCacheHits = 0;
    let totalAiTranslated = 0;

    for (const [file, texts] of untranslated) {
      const result = await this.translateFile(file, texts);
      
      if (result) {
        results.push(result);
        successCount++;
        // 统计缓存和 AI 翻译数量
        if (result.stats) {
          totalCacheHits += result.stats.cacheHits || 0;
          totalAiTranslated += result.stats.aiTranslated || 0;
        }
      } else {
        failCount++;
      }

      // 速率限制（仅在有 AI 翻译时）
      if (!result || result.stats?.aiTranslated > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('');
    
    // 显示统计信息
    const statsInfo = [];
    if (totalCacheHits > 0) statsInfo.push(`缓存命中 ${totalCacheHits}`);
    if (totalAiTranslated > 0) statsInfo.push(`AI 翻译 ${totalAiTranslated}`);
    
    success(`翻译完成: ${successCount} 文件成功, ${failCount} 失败`);
    if (statsInfo.length > 0) {
      log(`统计: ${statsInfo.join(', ')}`);
    }

    return {
      success: failCount === 0,
      files: results,
      totalTexts,
      stats: { successCount, failCount, totalCacheHits, totalAiTranslated }
    };
  }

  /**
   * 验证语言包完整性
   */
  verifyTranslations() {
    step('验证语言包完整性');
    
    const untranslated = this.scanAllFiles();
    
    if (untranslated.size === 0) {
      success('验证通过，所有文本已有翻译');
      return { complete: true, missing: [] };
    }

    let totalMissing = 0;
    const missing = [];

    for (const [file, texts] of untranslated) {
      totalMissing += texts.length;
      missing.push({ file, count: texts.length, texts });
    }

    warn(`验证失败，仍有 ${untranslated.size} 个文件共 ${totalMissing} 处未翻译`);
    
    return { complete: false, missing };
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const count = Object.keys(this.cache.translations).length;
    const cacheSize = fs.existsSync(this.cacheFile) 
      ? fs.statSync(this.cacheFile).size 
      : 0;
    
    return {
      entries: count,
      size: cacheSize,
      path: this.cacheFile
    };
  }

  /**
   * 清除翻译缓存
   */
  clearCache() {
    this.cache = { version: 1, translations: {} };
    this.saveCache();
    success('翻译缓存已清除');
  }

  /**
   * 显示缓存状态
   */
  showCacheStatus() {
    const stats = this.getCacheStats();
    step('翻译缓存状态');
    log(`缓存条目: ${stats.entries}`);
    log(`缓存大小: ${(stats.size / 1024).toFixed(2)} KB`);
    log(`缓存路径: ${stats.path}`);
  }

  /**
   * 计算汉化覆盖率
   * 返回详细的统计信息
   */
  getCoverageStats() {
    const existingTranslations = this.loadExistingTranslations();
    
    const tuiDir = path.join(this.sourceBase, 'src/cli/cmd/tui');
    if (!fs.existsSync(tuiDir)) {
      return null;
    }

    const files = glob.sync('**/*.tsx', { cwd: tuiDir });
    
    let totalTexts = 0;        // 总共检测到的文本数
    let translatedTexts = 0;   // 已翻译的文本数
    let totalFiles = 0;        // 总文件数
    let coveredFiles = 0;      // 完全覆盖的文件数
    const fileDetails = [];    // 每个文件的详情

    for (const file of files) {
      const relativePath = `src/cli/cmd/tui/${file}`;
      const fullPath = path.join(tuiDir, file);
      
      const texts = this.scanSourceFile(fullPath);
      if (texts.length === 0) continue; // 跳过没有可翻译文本的文件
      
      totalFiles++;
      const fileTranslations = existingTranslations.get(relativePath) || new Map();

      let fileTranslated = 0;
      let fileMissing = 0;

      for (const t of texts) {
        totalTexts++;
        
        // 检查是否已翻译
        let isTranslated = fileTranslations.has(t.original);
        if (!isTranslated) {
          for (const key of fileTranslations.keys()) {
            if (key.includes(t.text)) {
              isTranslated = true;
              break;
            }
          }
        }

        if (isTranslated) {
          translatedTexts++;
          fileTranslated++;
        } else {
          fileMissing++;
        }
      }

      const fileCoverage = texts.length > 0 ? (fileTranslated / texts.length * 100) : 100;
      
      if (fileMissing === 0) {
        coveredFiles++;
      }

      fileDetails.push({
        file: relativePath,
        total: texts.length,
        translated: fileTranslated,
        missing: fileMissing,
        coverage: fileCoverage
      });
    }

    const overallCoverage = totalTexts > 0 ? (translatedTexts / totalTexts * 100) : 100;
    const fileCoverage = totalFiles > 0 ? (coveredFiles / totalFiles * 100) : 100;

    return {
      overall: {
        totalTexts,
        translatedTexts,
        missingTexts: totalTexts - translatedTexts,
        coverage: overallCoverage
      },
      files: {
        totalFiles,
        coveredFiles,
        partialFiles: totalFiles - coveredFiles,
        coverage: fileCoverage
      },
      details: fileDetails.sort((a, b) => a.coverage - b.coverage) // 按覆盖率升序，未完成的在前
    };
  }

  /**
   * 显示汉化覆盖率报告
   */
  showCoverageReport(verbose = false) {
    const stats = this.getCoverageStats();
    
    if (!stats) {
      warn('无法计算覆盖率：源码目录不存在');
      return null;
    }

    step('汉化覆盖率');
    
    // 总体覆盖率 - 用进度条展示
    const barWidth = 20;
    const filled = Math.round(stats.overall.coverage / 100 * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    const coverageColor = stats.overall.coverage >= 95 ? 'green' : 
                          stats.overall.coverage >= 80 ? 'yellow' : 'red';
    
    console.log('');
    log(`  文本覆盖: [${bar}] ${stats.overall.coverage.toFixed(1)}%`, coverageColor);
    log(`  已翻译: ${stats.overall.translatedTexts} / ${stats.overall.totalTexts} 处`);
    
    console.log('');
    log(`  文件覆盖: ${stats.files.coveredFiles} / ${stats.files.totalFiles} 个文件 (${stats.files.coverage.toFixed(1)}%)`);
    
    // 如果有未完成的文件，显示前几个
    const incomplete = stats.details.filter(f => f.missing > 0);
    if (incomplete.length > 0 && verbose) {
      console.log('');
      warn(`未完成的文件 (${incomplete.length} 个):`);
      incomplete.slice(0, 5).forEach(f => {
        const shortPath = f.file.replace('src/cli/cmd/tui/', '');
        indent(`${shortPath}: ${f.translated}/${f.total} (${f.coverage.toFixed(0)}%)`, 2);
      });
      if (incomplete.length > 5) {
        indent(`... 还有 ${incomplete.length - 5} 个文件`, 2);
      }
    }

    return stats;
  }

  /**
   * 调用 AI 生成总结（流式输出，打字机效果）
   */
  async streamAISummary(prompt) {
    if (!this.checkConfig()) {
      return null;
    }

    const requestData = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true
    };

    if (!this.model.includes('thinking')) {
      requestData.max_tokens = 200;
    }

    const requestBody = JSON.stringify(requestData);

    return new Promise((resolve, reject) => {
      const baseUrl = this.apiBase.endsWith('/') ? this.apiBase.slice(0, -1) : this.apiBase;
      const fullUrl = `${baseUrl}/chat/completions`;
      const url = new URL(fullUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;
      let fullContent = '';

      const req = protocol.request(options, (res) => {
        res.on('data', chunk => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  process.stdout.write(content);
                  fullContent += content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        res.on('end', () => {
          console.log(''); // 换行
          resolve(fullContent);
        });
      });

      req.on('error', err => {
        reject(new Error(`请求失败: ${err.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * 生成覆盖率 AI 总结
   */
  async generateCoverageSummary(context) {
    const { uncoveredAnalysis, newTranslations } = context;
    const { needTranslate = [], noNeedTranslate = [] } = uncoveredAnalysis || {};
    
    // 构建未覆盖文件的原因统计
    const byReason = {};
    for (const f of noNeedTranslate) {
      if (!byReason[f.reason]) byReason[f.reason] = [];
      byReason[f.reason].push(f.file.replace('src/cli/cmd/tui/', ''));
    }

    const reasonList = Object.entries(byReason).map(([reason, files]) => 
      `${files.length} 个文件: ${reason} (如 ${files.slice(0, 2).join(', ')})`
    ).join('\n');

    // 构建新翻译的内容摘要
    let newTransInfo = '';
    if (newTranslations && newTranslations.files && newTranslations.files.length > 0) {
      const newFiles = newTranslations.files.map(f => {
        const shortPath = f.file.replace('src/cli/cmd/tui/', '');
        const samples = Object.values(f.translations).slice(0, 3).map(t => {
          // 提取翻译后的中文部分
          const match = t.match(/["']([^"']+)["']/);
          return match ? match[1] : t;
        });
        return `${shortPath}: ${samples.join('、')}`;
      });
      
      newTransInfo = `
本次新增翻译了 ${newTranslations.files.length} 个文件，包括：
${newFiles.slice(0, 5).join('\n')}
`;
    }

    // 构建 prompt
    let prompt = `你是一个汉化项目的助手。请用简短的中文总结以下情况，语气轻松友好，像朋友聊天一样。不要用"我"开头。`;

    if (newTransInfo) {
      prompt += `

${newTransInfo}

请总结本次翻译了什么内容（用通俗的话描述，比如"对话框的按钮文字"、"提示信息"等）。`;
    }

    if (noNeedTranslate.length > 0) {
      prompt += `

另外有 ${noNeedTranslate.length} 个文件被跳过，原因如下：
${reasonList}

${!newTransInfo ? '请简单说明为什么跳过这些文件。' : '也顺便说明为什么跳过那些文件。'}`;
    }

    if (needTranslate.length > 0) {
      prompt += `

还有 ${needTranslate.length} 个文件检测到 UI 文本但未翻译，需要关注。`;
    }

    prompt += `

请用 2-3 句话总结，简洁有趣。`;

    try {
      console.log('');
      console.log('    🤖 AI 总结:');
      console.log('    ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
      
      // 显示加载动画
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let frameIndex = 0;
      let loadingStarted = false;
      
      // 开始加载动画
      process.stdout.write('    ');
      const spinner = setInterval(() => {
        if (!loadingStarted) {
          loadingStarted = true;
        }
        process.stdout.write(`\r    ${frames[frameIndex]} 正在思考...`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
      
      // 清除加载动画的辅助函数
      const clearSpinner = () => {
        clearInterval(spinner);
        process.stdout.write('\r    ');  // 清除 spinner 行
        process.stdout.write('                    \r    ');  // 覆盖残留字符
      };
      
      // 包装流式输出，在收到第一个字符时清除 spinner
      let firstChar = true;
      const originalWrite = process.stdout.write.bind(process.stdout);
      
      await this.streamAISummaryWrapped(prompt, 50, () => {
        if (firstChar) {
          clearSpinner();
          firstChar = false;
        }
      });
      
      // 确保清除（如果没有输出）
      if (firstChar) {
        clearSpinner();
      }
      
      console.log('');
      console.log('    ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    } catch (err) {
      // AI 总结失败，静默处理
      console.log('    (AI 总结不可用)');
    }
  }

  /**
   * 流式输出 AI 总结（带自动换行）
   * @param {string} prompt - 提示词
   * @param {number} maxWidth - 每行最大宽度
   * @param {Function} onFirstChar - 收到第一个字符时的回调（用于清除 spinner）
   */
  async streamAISummaryWrapped(prompt, maxWidth = 50, onFirstChar = null) {
    if (!this.checkConfig()) {
      return null;
    }

    const requestData = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true
    };

    if (!this.model.includes('thinking')) {
      requestData.max_tokens = 200;
    }

    const requestBody = JSON.stringify(requestData);

    return new Promise((resolve, reject) => {
      const baseUrl = this.apiBase.endsWith('/') ? this.apiBase.slice(0, -1) : this.apiBase;
      const fullUrl = `${baseUrl}/chat/completions`;
      const url = new URL(fullUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;
      let fullContent = '';
      let currentLineLength = 0;
      let isFirstChar = true;

      const req = protocol.request(options, (res) => {
        res.on('data', chunk => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  // 第一个字符时触发回调（清除 spinner）
                  if (isFirstChar && onFirstChar) {
                    onFirstChar();
                    isFirstChar = false;
                  }
                  
                  // 逐字符处理，实现自动换行
                  for (const char of content) {
                    if (char === '\n') {
                      process.stdout.write('\n    ');
                      currentLineLength = 0;
                    } else {
                      process.stdout.write(char);
                      // 中文字符算 2 宽度，英文算 1
                      const charWidth = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
                      currentLineLength += charWidth;
                      
                      // 超过最大宽度时换行
                      if (currentLineLength >= maxWidth) {
                        process.stdout.write('\n    ');
                        currentLineLength = 0;
                      }
                    }
                  }
                  fullContent += content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        res.on('end', () => {
          resolve(fullContent);
        });
      });

      req.on('error', err => {
        reject(new Error(`请求失败: ${err.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  // ============================================
  // 增量翻译功能
  // ============================================

  /**
   * 获取 git 变更的文件列表
   * @param {string} since - 起始 commit（默认 HEAD~1）
   */
  getChangedFiles(since = 'HEAD~1') {
    const { execSync } = require('child_process');
    
    try {
      // 获取变更的 tsx 文件
      const result = execSync(
        `git diff --name-only ${since} -- "*.tsx"`,
        { cwd: this.opencodeDir, encoding: 'utf-8' }
      );
      
      const files = result.trim().split('\n').filter(f => f.length > 0);
      
      // 只保留 TUI 目录下的文件
      return files.filter(f => f.includes('src/cli/cmd/tui'));
    } catch (e) {
      // git 命令失败（可能不是 git 仓库或没有历史）
      return [];
    }
  }

  /**
   * 获取未提交的变更文件
   */
  getUncommittedFiles() {
    const { execSync } = require('child_process');
    
    try {
      // 获取暂存区 + 工作区变更的 tsx 文件
      const staged = execSync(
        `git diff --cached --name-only -- "*.tsx"`,
        { cwd: this.opencodeDir, encoding: 'utf-8' }
      );
      const unstaged = execSync(
        `git diff --name-only -- "*.tsx"`,
        { cwd: this.opencodeDir, encoding: 'utf-8' }
      );
      
      const files = new Set([
        ...staged.trim().split('\n'),
        ...unstaged.trim().split('\n')
      ].filter(f => f.length > 0));
      
      // 只保留 TUI 目录下的文件
      return Array.from(files).filter(f => f.includes('src/cli/cmd/tui'));
    } catch (e) {
      return [];
    }
  }

  /**
   * 增量翻译 - 只翻译变更的文件
   * @param {Object} options - 选项
   * @param {string} options.since - git commit 起点
   * @param {boolean} options.uncommitted - 是否包含未提交的变更
   * @param {boolean} options.dryRun - 只显示不翻译
   */
  async incrementalTranslate(options = {}) {
    const { since = null, uncommitted = true, dryRun = false } = options;

    if (!this.checkConfig()) {
      return { success: false, files: [] };
    }

    step('检测变更文件');

    // 获取变更文件列表
    let changedFiles = [];
    
    if (uncommitted) {
      changedFiles = this.getUncommittedFiles();
      if (changedFiles.length > 0) {
        log(`发现 ${changedFiles.length} 个未提交的变更文件`);
      }
    }
    
    if (since) {
      const sinceFiles = this.getChangedFiles(since);
      if (sinceFiles.length > 0) {
        log(`发现 ${sinceFiles.length} 个自 ${since} 以来的变更文件`);
        changedFiles = [...new Set([...changedFiles, ...sinceFiles])];
      }
    }

    if (changedFiles.length === 0) {
      success('没有检测到变更文件');
      return { success: true, files: [], totalTexts: 0 };
    }

    // 显示变更文件
    console.log('');
    for (const file of changedFiles.slice(0, 10)) {
      const shortPath = file.replace('packages/opencode/', '');
      indent(`• ${shortPath}`, 2);
    }
    if (changedFiles.length > 10) {
      indent(`... 还有 ${changedFiles.length - 10} 个文件`, 2);
    }
    console.log('');

    // 扫描变更文件中的未翻译文本
    step('扫描变更文件中的未翻译文本');
    
    const existingTranslations = this.loadExistingTranslations();
    const untranslated = new Map();

    for (const file of changedFiles) {
      // 转换路径格式
      let relativePath = file;
      if (file.startsWith('packages/opencode/')) {
        relativePath = file.replace('packages/opencode/', '');
      }
      
      const fullPath = path.join(this.sourceBase, relativePath);
      if (!fs.existsSync(fullPath)) continue;

      const texts = this.scanSourceFile(fullPath);
      if (texts.length === 0) continue;

      // 过滤已翻译的
      const fileTranslations = existingTranslations.get(relativePath) || new Map();
      const needTranslate = texts.filter(t => {
        if (fileTranslations.has(t.original)) return false;
        for (const key of fileTranslations.keys()) {
          if (key.includes(t.text)) return false;
        }
        return true;
      });

      if (needTranslate.length > 0) {
        untranslated.set(relativePath, needTranslate);
      }
    }

    if (untranslated.size === 0) {
      success('变更文件中没有新的未翻译文本');
      return { success: true, files: [], totalTexts: 0 };
    }

    // 统计
    let totalTexts = 0;
    for (const texts of untranslated.values()) {
      totalTexts += texts.length;
    }

    warn(`发现 ${untranslated.size} 个文件共 ${totalTexts} 处未翻译文本`);

    if (dryRun) {
      console.log('');
      for (const [file, texts] of untranslated) {
        const shortPath = file.replace('src/cli/cmd/tui/', '');
        indent(`${shortPath} (${texts.length} 处)`, 2);
        texts.slice(0, 3).forEach(t => indent(`  - "${t.text.substring(0, 40)}..."`, 2));
      }
      return { success: true, files: [], totalTexts, dryRun: true };
    }

    // 翻译
    step('AI 翻译变更文件');
    const results = [];
    
    for (const [file, texts] of untranslated) {
      const result = await this.translateFile(file, texts);
      if (result) {
        results.push(result);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    success(`增量翻译完成: ${results.length} 个文件`);

    return {
      success: true,
      files: results,
      totalTexts,
      changedFiles: changedFiles.length
    };
  }

  // ============================================
  // 翻译质量检查功能
  // ============================================

  /**
   * 加载所有语言包翻译
   */
  loadAllTranslations() {
    const translations = [];
    const categories = fs.readdirSync(this.i18nDir, { withFileTypes: true });
    
    for (const cat of categories) {
      if (!cat.isDirectory()) continue;
      
      const catDir = path.join(this.i18nDir, cat.name);
      const jsonFiles = glob.sync('*.json', { cwd: catDir });
      
      for (const file of jsonFiles) {
        const filePath = path.join(catDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (content.replacements) {
            for (const [original, translated] of Object.entries(content.replacements)) {
              translations.push({
                category: cat.name,
                configFile: file,
                configPath: filePath,
                sourceFile: content.file,
                original,
                translated
              });
            }
          }
        } catch (e) {
          // 跳过损坏的文件
        }
      }
    }
    return translations;
  }

  /**
   * 检查单条翻译的语法安全性
   * 返回问题数组，空数组表示安全
   */
  checkSyntaxSafety(original, translated) {
    const issues = [];
    
    // 1. 检查引号匹配
    const origDoubleQuotes = (original.match(/"/g) || []).length;
    const transDoubleQuotes = (translated.match(/"/g) || []).length;
    
    if (origDoubleQuotes !== transDoubleQuotes) {
      issues.push({
        type: '引号不匹配',
        severity: 'error',
        reason: `双引号数量不一致: 原文 ${origDoubleQuotes} 个, 译文 ${transDoubleQuotes} 个`,
        suggestion: '检查翻译中是否有多余或缺少的双引号'
      });
    }
    
    // 单引号检查 - 需要区分语法引号和内容引号
    // 如果原文是在双引号/反引号字符串内，单引号变化通常是安全的（如所有格 's、命令引用）
    const isInString = /^["'`].*["'`]$/.test(original.trim()) || 
                       original.includes('`') ||
                       /^[a-zA-Z]+:\s*["'`]/.test(original); // 如 message: `xxx`
    
    if (!isInString) {
      const origSingleQuotes = (original.match(/'/g) || []).length;
      const transSingleQuotes = (translated.match(/'/g) || []).length;
      
      if (origSingleQuotes !== transSingleQuotes) {
        // 检查是否只是移除了所有格 's 或命令引号（这是安全的）
        const origPossessive = (original.match(/'s\b/g) || []).length;
        const origCommandQuotes = (original.match(/'[a-z]+ [a-z]+'/gi) || []).length * 2;
        const expectedDiff = origPossessive + origCommandQuotes;
        
        if (Math.abs(origSingleQuotes - transSingleQuotes) > expectedDiff) {
          issues.push({
            type: '引号不匹配',
            severity: 'warning',  // 降级为警告
            reason: `单引号数量不一致: 原文 ${origSingleQuotes} 个, 译文 ${transSingleQuotes} 个`,
            suggestion: '检查翻译中是否有多余或缺少的单引号'
          });
        }
      }
    }

    // 2. 检查 JSX 标签匹配
    const origTags = original.match(/<\/?[a-zA-Z][^>]*>/g) || [];
    const transTags = translated.match(/<\/?[a-zA-Z][^>]*>/g) || [];
    
    if (origTags.length !== transTags.length) {
      issues.push({
        type: 'JSX标签破坏',
        severity: 'error',
        reason: `JSX 标签数量不一致: 原文 ${origTags.length} 个, 译文 ${transTags.length} 个`,
        suggestion: '翻译可能破坏了 JSX 结构，检查 < > 标签'
      });
    }

    // 3. 检查花括号匹配（JSX 表达式）
    const origOpenBraces = (original.match(/\{/g) || []).length;
    const origCloseBraces = (original.match(/\}/g) || []).length;
    const transOpenBraces = (translated.match(/\{/g) || []).length;
    const transCloseBraces = (translated.match(/\}/g) || []).length;
    
    // 检查数量是否与原文一致
    if (origOpenBraces !== transOpenBraces || origCloseBraces !== transCloseBraces) {
      issues.push({
        type: '花括号不匹配',
        severity: 'error',
        reason: `花括号数量不一致: 原文 { ${origOpenBraces} 个 } ${origCloseBraces} 个, 译文 { ${transOpenBraces} 个 } ${transCloseBraces} 个`,
        suggestion: '翻译可能破坏了 JSX 表达式，检查 { } 括号'
      });
    }
    
    // 3.1 检查 {highlight}...{/highlight} 标签对
    const origHighlightOpen = (original.match(/\{highlight\}/g) || []).length;
    const origHighlightClose = (original.match(/\{\/highlight\}/g) || []).length;
    const transHighlightOpen = (translated.match(/\{highlight\}/g) || []).length;
    const transHighlightClose = (translated.match(/\{\/highlight\}/g) || []).length;
    
    if (origHighlightOpen !== transHighlightOpen || origHighlightClose !== transHighlightClose) {
      issues.push({
        type: 'highlight标签不匹配',
        severity: 'error',
        reason: `{highlight}/{/highlight} 标签不一致: 原文 ${origHighlightOpen}/${origHighlightClose} 对, 译文 ${transHighlightOpen}/${transHighlightClose} 对`,
        suggestion: '确保翻译中保留所有 {highlight}...{/highlight} 标签对'
      });
    }

    // 4. 检查变量占位符是否保留
    const origVars = original.match(/\$\{[^}]+\}|\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g) || [];
    const transVars = translated.match(/\$\{[^}]+\}|\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g) || [];
    
    for (const v of origVars) {
      if (!translated.includes(v)) {
        issues.push({
          type: '变量丢失',
          severity: 'error',
          reason: `变量 ${v} 在翻译中丢失`,
          suggestion: `确保翻译中保留 ${v}`
        });
      }
    }

    // 5. 检查转义字符
    const origEscapes = original.match(/\\[nrt"'\\]/g) || [];
    const transEscapes = translated.match(/\\[nrt"'\\]/g) || [];
    
    if (origEscapes.length !== transEscapes.length) {
      issues.push({
        type: '转义字符问题',
        severity: 'warning',
        reason: `转义字符数量不一致`,
        suggestion: '检查 \\n \\t 等转义字符是否正确保留'
      });
    }

    // 6. 检查是否有未闭合的括号
    const checkBalance = (str, open, close) => {
      let count = 0;
      for (const c of str) {
        if (c === open) count++;
        if (c === close) count--;
        if (count < 0) return false;
      }
      return count === 0;
    };

    // 只有当原文本身是平衡的，才检查译文的平衡性
    // 有些代码片段（如 "} active"）本身就不完整，不应报错
    if (checkBalance(original, '(', ')') && !checkBalance(translated, '(', ')')) {
      issues.push({
        type: '括号不匹配',
        severity: 'error',
        reason: '小括号 () 不匹配',
        suggestion: '检查翻译中的括号是否正确闭合'
      });
    }

    if (checkBalance(original, '[', ']') && !checkBalance(translated, '[', ']')) {
      issues.push({
        type: '括号不匹配',
        severity: 'error',
        reason: '方括号 [] 不匹配',
        suggestion: '检查翻译中的括号是否正确闭合'
      });
    }

    if (checkBalance(original, '{', '}') && !checkBalance(translated, '{', '}')) {
      issues.push({
        type: '花括号不闭合',
        severity: 'error',
        reason: '花括号 {} 不匹配',
        suggestion: '检查翻译中的花括号是否正确闭合'
      });
    }

    // 7. 检查是否破坏了属性格式
    // 例如 title="xxx" 变成 title="xxx
    if (original.match(/^[a-zA-Z]+="[^"]*"$/) && !translated.match(/^[a-zA-Z]+="[^"]*"$/)) {
      issues.push({
        type: '属性格式破坏',
        severity: 'error',
        reason: '属性格式被破坏，可能导致语法错误',
        suggestion: '确保翻译保持 key="value" 格式'
      });
    }

    return issues;
  }

  /**
   * 检查翻译质量（本地语法检查 + AI 语义检查 + 自动修复）
   */
  async checkQuality(options = {}) {
    const { fix = true, aiCheck = true } = options;  // 默认开启自动修复

    step('加载现有翻译');
    const translations = this.loadAllTranslations();
    log(`共加载 ${translations.length} 条翻译`);

    // ========================================
    // 阶段 1: 本地语法安全检查（快速，不调用 API）
    // ========================================
    step('语法安全检查');
    
    const syntaxIssues = [];
    let checkedCount = 0;
    
    for (const t of translations) {
      const issues = this.checkSyntaxSafety(t.original, t.translated);
      checkedCount++;
      
      for (const issue of issues) {
        syntaxIssues.push({
          ...issue,
          original: t.original,
          translated: t.translated,
          sourceFile: t.sourceFile,
          configFile: t.configFile,
          configPath: t.configPath
        });
      }
    }

    // 显示语法问题
    const syntaxErrors = syntaxIssues.filter(i => i.severity === 'error');
    
    if (syntaxErrors.length > 0) {
      console.log('');
      error(`发现 ${syntaxErrors.length} 处语法问题（可能导致编译错误）:`);
      console.log('');
      
      for (const issue of syntaxErrors.slice(0, 5)) {
        console.log(`    ❌ ${issue.type}`);
        console.log(`       文件: ${issue.sourceFile || '未知'}`);
        console.log(`       原文: ${issue.original.substring(0, 60)}${issue.original.length > 60 ? '...' : ''}`);
        console.log(`       译文: ${issue.translated.substring(0, 60)}${issue.translated.length > 60 ? '...' : ''}`);
        console.log(`       问题: ${issue.reason}`);
        console.log('');
      }
      
      if (syntaxErrors.length > 5) {
        indent(`... 还有 ${syntaxErrors.length - 5} 处错误`, 2);
        console.log('');
      }

      // ========================================
      // 阶段 2: AI 自动修复语法问题
      // ========================================
      if (fix && this.checkConfig()) {
        console.log('');
        step('AI 自动修复语法问题');
        
        const fixedCount = await this.autoFixSyntaxIssues(syntaxErrors);
        
        if (fixedCount > 0) {
          success(`成功修复 ${fixedCount} 处语法问题`);
          
          // 重新检查
          console.log('');
          step('重新验证');
          const recheck = this.recheckSyntax(translations);
          
          if (recheck.errors === 0) {
            success('所有语法问题已修复');
          } else {
            warn(`仍有 ${recheck.errors} 处问题未能修复，可能需要手动处理`);
          }
        }
      }
    } else {
      success(`检查 ${checkedCount} 条翻译，未发现语法问题`);
    }

    // ========================================
    // 阶段 3: AI 语义质量检查（可选）
    // ========================================
    let aiIssues = [];
    
    if (aiCheck && this.checkConfig() && syntaxErrors.length === 0) {
      console.log('');
      step('AI 语义质量检查 (抽样 30 条)');
      console.log('');

      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let frameIndex = 0;
      const spinner = setInterval(() => {
        process.stdout.write(`\r    ${frames[frameIndex]} 正在审查...`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);

      try {
        const sample = translations
          .sort(() => Math.random() - 0.5)
          .slice(0, 30);
        
        aiIssues = await this.reviewTranslationsWithAI(sample);
        
        clearInterval(spinner);
        process.stdout.write('\r                              \r');

        if (aiIssues.length > 0) {
          warn(`AI 发现 ${aiIssues.length} 处翻译质量问题:`);
          console.log('');
          
          for (const issue of aiIssues.slice(0, 5)) {
            console.log(`    ⚠️  ${issue.type || '翻译问题'}`);
            console.log(`       原文: ${issue.original?.substring(0, 50) || ''}...`);
            console.log(`       问题: ${issue.reason}`);
            if (issue.suggestion) {
              console.log(`       建议: ${issue.suggestion}`);
            }
            console.log('');
          }
        } else {
          success('AI 审查通过，翻译质量良好');
        }
      } catch (err) {
        clearInterval(spinner);
        process.stdout.write('\r                              \r');
        warn(`AI 审查跳过: ${err.message}`);
      }
    }

    // 重新加载检查最终状态
    const finalTranslations = this.loadAllTranslations();
    let finalErrors = 0;
    for (const t of finalTranslations) {
      const issues = this.checkSyntaxSafety(t.original, t.translated);
      finalErrors += issues.filter(i => i.severity === 'error').length;
    }

    return { 
      success: finalErrors === 0,
      issues: [...syntaxIssues, ...aiIssues],
      syntaxIssues,
      aiIssues,
      checked: checkedCount,
      fixed: syntaxErrors.length - finalErrors
    };
  }

  /**
   * AI 自动修复语法问题
   */
  async autoFixSyntaxIssues(issues) {
    if (!this.checkConfig() || issues.length === 0) {
      return 0;
    }

    // 按配置文件分组
    const byConfigFile = {};
    for (const issue of issues) {
      if (!issue.configPath) continue;
      if (!byConfigFile[issue.configPath]) {
        byConfigFile[issue.configPath] = [];
      }
      byConfigFile[issue.configPath].push(issue);
    }

    let fixedCount = 0;

    for (const [configPath, fileIssues] of Object.entries(byConfigFile)) {
      // 读取配置文件
      let config;
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (e) {
        continue;
      }

      // 构建修复请求（保留原始 key 以便后续匹配）
      const fixRequests = fileIssues.map((issue, idx) => ({
        index: idx + 1,
        originalKey: issue.original,  // 完整的 key（可能带引号）
        badTranslation: issue.translated,
        problem: issue.reason
      }));

      // 显示进度
      const fileName = path.basename(configPath);
      process.stdout.write(`    修复 ${fileName} (${fixRequests.length} 处)...`);

      try {
        // 调用 AI 修复
        const fixes = await this.callAIForFix(fixRequests);

        // 应用修复（通过索引匹配回原始 key）
        let fileFixed = 0;
        for (const fix of fixes) {
          // 用索引找到对应的原始请求
          const request = fixRequests.find(r => r.index === fix.index);
          if (request && fix.fixedTranslation && config.replacements[request.originalKey]) {
            config.replacements[request.originalKey] = fix.fixedTranslation;
            fileFixed++;
          }
        }

        // 写回文件
        if (fileFixed > 0) {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
          fixedCount += fileFixed;
          process.stdout.write(` ✓ 修复 ${fileFixed} 处\n`);
        } else {
          process.stdout.write(` 无需修复\n`);
        }
      } catch (err) {
        process.stdout.write(` ✗ 失败: ${err.message}\n`);
      }

      // 速率限制
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return fixedCount;
  }

  /**
   * 调用 AI 修复翻译
   */
  async callAIForFix(fixRequests) {
    const requestList = fixRequests.map(r => 
      `${r.index}. 错误翻译: ${r.badTranslation}\n   问题: ${r.problem}`
    ).join('\n\n');

    const prompt = `你是翻译修复专家。以下翻译有语法问题，请修复：

${requestList}

修复规则：
1. 保持引号数量一致（双引号/单引号）
2. 保持花括号 {} 数量一致（左右括号数量必须相等）
3. 保持 {highlight}...{/highlight} 等标签不变
4. 保持 \${variable} 变量不变
5. 括号 () [] {} 必须正确闭合
6. 翻译格式：简短中文翻译 (English hint)，不要重复原文
7. 如果错误翻译中的标签/变量不完整，根据格式补全

输出 JSON 数组，每项用序号对应：
[{"index":1,"fixedTranslation":"修复后的翻译"},{"index":2,"fixedTranslation":"..."}]

只输出 JSON 数组，不要其他内容。`;

    const response = await this.callAI([{ text: prompt }], 'fix-translation');

    try {
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) return [];
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return [];
    }
  }

  /**
   * 重新检查语法（用于修复后验证）
   */
  recheckSyntax(originalTranslations) {
    const translations = this.loadAllTranslations();
    let errors = 0;
    let warnings = 0;

    for (const t of translations) {
      const issues = this.checkSyntaxSafety(t.original, t.translated);
      errors += issues.filter(i => i.severity === 'error').length;
      warnings += issues.filter(i => i.severity === 'warning').length;
    }

    return { errors, warnings };
  }

  /**
   * 调用 AI 审查翻译语义质量
   */
  async reviewTranslationsWithAI(translations) {
    const samples = translations.map((t, i) => 
      `${i + 1}. "${t.original}" → "${t.translated}"`
    ).join('\n');

    const prompt = `你是软件本地化专家。审查以下翻译，找出问题：

${samples}

检查：
1. 翻译错误 - 意思不对
2. 不自然 - 翻译腔重，不口语化
3. 术语不一致 - 同词不同译
4. 格式问题 - 应保留 "中文 (English)" 双语格式

输出 JSON 数组，每项：
{"index":编号,"type":"问题类型","reason":"原因","suggestion":"建议"}

没问题返回 []，只输出 JSON。`;

    const response = await this.callAI([{ text: prompt }], 'quality-check');
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      const issues = JSON.parse(jsonMatch[0]);
      
      return issues.map(issue => ({
        ...issue,
        severity: 'warning',
        original: translations[issue.index - 1]?.original || '',
        translated: translations[issue.index - 1]?.translated || '',
        sourceFile: translations[issue.index - 1]?.sourceFile || ''
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * 显示翻译质量报告
   */
  async showQualityReport() {
    const result = await this.checkQuality({ aiCheck: true });
    
    console.log('');
    console.log('    ═══════════════════════════════════════');
    console.log('    📊 翻译质量报告');
    console.log('    ═══════════════════════════════════════');
    console.log('');
    console.log(`    检查条数: ${result.checked}`);
    
    const syntaxErrors = result.syntaxIssues?.filter(i => i.severity === 'error').length || 0;
    const syntaxWarnings = result.syntaxIssues?.filter(i => i.severity === 'warning').length || 0;
    const aiIssues = result.aiIssues?.length || 0;
    
    console.log(`    语法错误: ${syntaxErrors > 0 ? '\x1b[31m' + syntaxErrors + '\x1b[0m' : '0'}`);
    console.log(`    语法警告: ${syntaxWarnings > 0 ? '\x1b[33m' + syntaxWarnings + '\x1b[0m' : '0'}`);
    console.log(`    翻译问题: ${aiIssues > 0 ? '\x1b[33m' + aiIssues + '\x1b[0m' : '0'}`);
    
    // 质量评分（语法错误扣 10 分，警告扣 2 分，AI 问题扣 1 分）
    const score = Math.max(0, 100 - syntaxErrors * 10 - syntaxWarnings * 2 - aiIssues * 1);
    const scoreColor = score >= 90 ? '\x1b[32m' : score >= 70 ? '\x1b[33m' : '\x1b[31m';
    
    console.log('');
    if (syntaxErrors > 0) {
      console.log(`    ⚠️  有 ${syntaxErrors} 处语法错误可能导致编译失败！`);
    }
    console.log(`    质量评分: ${scoreColor}${score}/100\x1b[0m`);
    
    console.log('');
    console.log('    ═══════════════════════════════════════');

    return result;
  }
}

module.exports = Translator;

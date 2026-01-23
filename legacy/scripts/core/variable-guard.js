/**
 * 变量保护检测模块
 * 检测翻译中的变量占位符是否被正确保留
 */

/**
 * 支持的变量模式
 */
const VARIABLE_PATTERNS = [
  // ES6 模板字符串: ${variable}, ${obj.property}, ${func()}
  {
    name: 'es6-template',
    pattern: /\$\{[^}]+\}/g,
    description: 'ES6 模板字符串变量',
  },
  // React/格式化字符串: {variable}, {obj.property}
  {
    name: 'curly-brace',
    pattern: /\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g,
    description: '花括号变量',
  },
  // 模板引擎: {{variable}}, {{ variable }}
  {
    name: 'mustache',
    pattern: /\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\}\}/g,
    description: 'Mustache 模板变量',
  },
  // printf 风格: %s, %d, %f, %i, %o, %j
  {
    name: 'printf',
    pattern: /%[sdfioj%]/g,
    description: 'printf 格式占位符',
  },
  // 位置参数: {0}, {1}, {2}
  {
    name: 'positional',
    pattern: /\{\d+\}/g,
    description: '位置参数',
  },
];

/**
 * 从文本中提取所有变量
 * @param {string} text - 要分析的文本
 * @returns {Array<{value: string, type: string}>} 变量列表
 */
function extractVariables(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const variables = [];
  const seen = new Set();

  for (const { name, pattern } of VARIABLE_PATTERNS) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (!seen.has(match)) {
        seen.add(match);
        variables.push({
          value: match,
          type: name,
        });
      }
    }
  }

  return variables;
}

/**
 * 获取变量值列表
 * @param {string} text - 要分析的文本
 * @returns {string[]} 变量值数组
 */
function getVariableValues(text) {
  return extractVariables(text).map(v => v.value);
}

/**
 * 验证翻译中的变量是否被正确保留
 * @param {string} original - 原文
 * @param {string} translated - 译文
 * @returns {{valid: boolean, issues: Array, expected: string[], actual: string[]}}
 */
function validateTranslation(original, translated) {
  const expectedVars = getVariableValues(original);
  const actualVars = getVariableValues(translated);

  // 如果原文没有变量，直接通过
  if (expectedVars.length === 0) {
    return {
      valid: true,
      issues: [],
      expected: [],
      actual: [],
    };
  }

  const issues = [];

  // 检查每个预期的变量是否在译文中存在
  for (const expectedVar of expectedVars) {
    if (!translated.includes(expectedVar)) {
      // 检查是否变量名被翻译了
      const possibleTranslation = findPossibleTranslation(expectedVar, actualVars);
      if (possibleTranslation) {
        issues.push({
          type: 'translated',
          expected: expectedVar,
          actual: possibleTranslation,
          message: `变量 "${expectedVar}" 被翻译为 "${possibleTranslation}"`,
        });
      } else {
        issues.push({
          type: 'missing',
          expected: expectedVar,
          actual: null,
          message: `变量 "${expectedVar}" 在译文中丢失`,
        });
      }
    }
  }

  // 检查是否有多余的变量
  for (const actualVar of actualVars) {
    if (!expectedVars.includes(actualVar) && !isKnownNewVariable(actualVar, issues)) {
      issues.push({
        type: 'extra',
        expected: null,
        actual: actualVar,
        message: `译文中出现了新的变量 "${actualVar}"`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    expected: expectedVars,
    actual: actualVars,
  };
}

/**
 * 尝试找到可能的翻译对应关系
 * 例如: ${name} -> ${名称}
 */
function findPossibleTranslation(expectedVar, actualVars) {
  // 提取变量的包装格式
  const wrapperMatch = expectedVar.match(/^(\$?\{+)\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*(\}+)$/);
  if (!wrapperMatch) {
    return null;
  }

  const [, prefix, suffix] = wrapperMatch;

  // 查找使用相同包装格式但内容不同的变量
  for (const actualVar of actualVars) {
    if (actualVar.startsWith(prefix) && actualVar.endsWith(suffix)) {
      // 检查内容是否是中文或其他非ASCII字符（表示被翻译了）
      const content = actualVar.slice(prefix.length, -suffix.length).trim();
      if (/[\u4e00-\u9fa5]/.test(content)) {
        return actualVar;
      }
    }
  }

  return null;
}

/**
 * 检查变量是否已知是被翻译的新变量
 */
function isKnownNewVariable(actualVar, issues) {
  return issues.some(issue => issue.actual === actualVar);
}

/**
 * 批量验证翻译配置中的所有替换规则
 * @param {Object} replacements - {原文: 译文} 的键值对
 * @returns {{valid: boolean, results: Array}}
 */
function validateReplacements(replacements) {
  if (!replacements || typeof replacements !== 'object') {
    return { valid: true, results: [] };
  }

  const results = [];
  let allValid = true;

  for (const [original, translated] of Object.entries(replacements)) {
    const validation = validateTranslation(original, translated);
    if (!validation.valid) {
      allValid = false;
      results.push({
        original,
        translated,
        ...validation,
      });
    }
  }

  return {
    valid: allValid,
    results,
  };
}

/**
 * 格式化验证结果为可读字符串
 * @param {Object} result - validateReplacements 的结果
 * @returns {string}
 */
function formatValidationResult(result) {
  if (result.valid) {
    return '✓ 所有变量验证通过';
  }

  const lines = ['✗ 发现变量问题:'];

  for (const item of result.results) {
    lines.push(`\n  原文: "${item.original}"`);
    lines.push(`  译文: "${item.translated}"`);
    for (const issue of item.issues) {
      lines.push(`    ⚠️ ${issue.message}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  VARIABLE_PATTERNS,
  extractVariables,
  getVariableValues,
  validateTranslation,
  validateReplacements,
  formatValidationResult,
};

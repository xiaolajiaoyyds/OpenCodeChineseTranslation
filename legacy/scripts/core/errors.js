/**
 * 翻译错误类型和处理模块
 * 提供统一的错误分类、格式化和收集机制
 */

const { error: errorColor, warn, indent } = require('./colors.js');

/**
 * 错误类型枚举
 */
const ErrorType = {
  CONFIG_INVALID: 'CONFIG_INVALID',       // 配置文件格式错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',       // 目标文件不存在
  PATTERN_NOT_FOUND: 'PATTERN_NOT_FOUND', // 原文匹配不到
  VARIABLE_CORRUPTED: 'VARIABLE_CORRUPTED', // 变量被破坏
  ENCODING_ERROR: 'ENCODING_ERROR',       // 编码问题
};

/**
 * 错误严重级别
 */
const Severity = {
  ERROR: 'error',     // 严重错误，阻止翻译
  WARNING: 'warning', // 警告，可能有问题
  INFO: 'info',       // 信息，仅供参考
};

/**
 * 错误类型对应的默认严重级别
 */
const ErrorSeverityMap = {
  [ErrorType.CONFIG_INVALID]: Severity.ERROR,
  [ErrorType.FILE_NOT_FOUND]: Severity.WARNING,
  [ErrorType.PATTERN_NOT_FOUND]: Severity.WARNING,
  [ErrorType.VARIABLE_CORRUPTED]: Severity.ERROR,
  [ErrorType.ENCODING_ERROR]: Severity.ERROR,
};

/**
 * 错误类型的中文描述
 */
const ErrorMessages = {
  [ErrorType.CONFIG_INVALID]: '配置文件格式错误',
  [ErrorType.FILE_NOT_FOUND]: '目标文件不存在',
  [ErrorType.PATTERN_NOT_FOUND]: '原文匹配不到（源码可能已更新）',
  [ErrorType.VARIABLE_CORRUPTED]: '变量占位符被意外翻译',
  [ErrorType.ENCODING_ERROR]: '文件编码问题',
};

/**
 * 翻译错误类
 */
class TranslationError {
  /**
   * @param {string} type - 错误类型 (ErrorType)
   * @param {string} file - 相关文件路径
   * @param {Object} details - 详细信息
   * @param {string} [details.pattern] - 匹配模式
   * @param {string} [details.expected] - 预期值
   * @param {string} [details.actual] - 实际值
   * @param {number} [details.line] - 行号
   * @param {string} [details.message] - 自定义消息
   */
  constructor(type, file, details = {}) {
    this.type = type;
    this.file = file;
    this.details = details;
    this.severity = ErrorSeverityMap[type] || Severity.WARNING;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 获取错误的简短描述
   */
  getMessage() {
    return this.details.message || ErrorMessages[this.type] || '未知错误';
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      type: this.type,
      severity: this.severity,
      file: this.file,
      message: this.getMessage(),
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  /**
   * 格式化为可读字符串
   */
  toString() {
    let result = `[${this.severity.toUpperCase()}] ${this.file}: ${this.getMessage()}`;

    if (this.details.pattern) {
      result += `\n    原文: "${this.details.pattern}"`;
    }
    if (this.details.expected && this.details.actual) {
      result += `\n    预期: ${this.details.expected}`;
      result += `\n    实际: ${this.details.actual}`;
    }
    if (this.details.line) {
      result += ` (行 ${this.details.line})`;
    }

    return result;
  }
}

/**
 * 错误收集器
 * 用于在翻译过程中收集所有错误和警告
 */
class ErrorCollector {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 添加错误
   */
  addError(type, file, details = {}) {
    const err = new TranslationError(type, file, details);
    if (err.severity === Severity.ERROR) {
      this.errors.push(err);
    } else {
      this.warnings.push(err);
    }
    return err;
  }

  /**
   * 添加文件未找到错误
   */
  fileNotFound(file, configFile) {
    return this.addError(ErrorType.FILE_NOT_FOUND, file, {
      message: `目标文件不存在`,
      configFile,
    });
  }

  /**
   * 添加模式匹配失败错误
   */
  patternNotFound(file, pattern, configFile) {
    return this.addError(ErrorType.PATTERN_NOT_FOUND, file, {
      pattern,
      message: `在源码中未找到匹配文本`,
      configFile,
    });
  }

  /**
   * 添加变量被破坏错误
   */
  variableCorrupted(file, original, translated, variables) {
    return this.addError(ErrorType.VARIABLE_CORRUPTED, file, {
      pattern: original,
      expected: variables.expected.join(', '),
      actual: variables.actual.join(', '),
      message: `变量占位符被翻译`,
    });
  }

  /**
   * 添加配置无效错误
   */
  configInvalid(file, message) {
    return this.addError(ErrorType.CONFIG_INVALID, file, { message });
  }

  /**
   * 是否有错误
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * 是否有警告
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      total: this.errors.length + this.warnings.length,
    };
  }

  /**
   * 打印所有错误到控制台
   */
  print() {
    if (this.errors.length > 0) {
      errorColor(`\n❌ 错误 (${this.errors.length} 个):`);
      for (const err of this.errors) {
        indent(`  ${err.toString()}`, 2);
      }
    }

    if (this.warnings.length > 0) {
      warn(`\n⚠️ 警告 (${this.warnings.length} 个):`);
      for (const w of this.warnings) {
        indent(`  ${w.toString()}`, 2);
      }
    }
  }

  /**
   * 转换为 JSON
   */
  toJSON() {
    return {
      errors: this.errors.map(e => e.toJSON()),
      warnings: this.warnings.map(w => w.toJSON()),
      stats: this.getStats(),
    };
  }

  /**
   * 清空收集器
   */
  clear() {
    this.errors = [];
    this.warnings = [];
  }
}

module.exports = {
  ErrorType,
  Severity,
  TranslationError,
  ErrorCollector,
  ErrorMessages,
};

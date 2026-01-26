const test = require("node:test");
const assert = require("node:assert/strict");

test("check --limit propagates to Translator.showQualityReport sampleSize", async () => {
  const Translator = require("../core/translator.js");
  const check = require("../commands/check.js");

  const original = Translator.prototype.showQualityReport;
  let captured = null;
  Translator.prototype.showQualityReport = async function (options) {
    captured = options;
    return { success: true, checked: 0, syntaxIssues: [], aiIssues: [] };
  };

  try {
    const ok = await check.runQualityCheck({ limit: 42, fix: false });
    assert.equal(ok, true);
    assert.equal(captured.sampleSize, 42);
  } finally {
    Translator.prototype.showQualityReport = original;
  }
});


const test = require("node:test");
const assert = require("node:assert/strict");

test("check quality --fix uses pipeline packQuality", async () => {
  const pipeline = require("../core/pipeline.js");
  let called = null;
  pipeline.runPipeline = async (preset, options) => {
    called = { preset, options };
    return { ok: true, steps: [] };
  };

  delete require.cache[require.resolve("../commands/check.js")];
  const check = require("../commands/check.js");

  const ok = await check.runQualityCheck({ limit: 12, fix: true });
  assert.equal(ok, true);
  assert.equal(called.preset, "packQuality");
  assert.equal(called.options.fixPackQuality, true);
  assert.equal(called.options.qualitySampleSize, 12);
});


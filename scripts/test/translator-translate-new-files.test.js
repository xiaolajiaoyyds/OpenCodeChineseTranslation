const test = require("node:test");
const assert = require("node:assert/strict");

test("Translator.translateNewFiles fails when OPENAI_API_KEY missing", async () => {
  const Translator = require("../core/translator.js");
  const translator = new Translator();

  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const res = await translator.translateNewFiles(
    ["src/cli/cmd/tui/context/theme.tsx"],
    "/tmp",
    { dryRun: true },
  );

  if (original) process.env.OPENAI_API_KEY = original;

  assert.equal(res.success, false);
  assert.equal(res.stats.failCount, 1);
  assert.equal(res.stats.totalFiles, 1);
});


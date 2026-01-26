const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("user-config saves and loads and applies to env", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "opencn-home-"));
  const oldHome = process.env.HOME;
  process.env.HOME = tmp;

  delete require.cache[require.resolve("../core/user-config.js")];
  const cfg = require("../core/user-config.js");

  const savedPath = cfg.saveUserConfig({
    openaiApiKey: "sk-test-1234",
    openaiApiBase: "http://127.0.0.1:9999/v1",
    openaiModel: "test-model",
  });

  assert.ok(fs.existsSync(savedPath));

  const loaded = cfg.loadUserConfig();
  assert.equal(loaded.openaiApiKey, "sk-test-1234");

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_BASE;
  delete process.env.OPENAI_MODEL;

  cfg.applyUserConfigToEnv({ override: false });
  assert.equal(process.env.OPENAI_API_KEY, "sk-test-1234");
  assert.equal(process.env.OPENAI_API_BASE, "http://127.0.0.1:9999/v1");
  assert.equal(process.env.OPENAI_MODEL, "test-model");

  process.env.HOME = oldHome;
});


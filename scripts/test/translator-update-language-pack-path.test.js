const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("Translator.updateLanguagePack writes into category subdir", () => {
  const Translator = require("../core/translator.js");
  const translator = new Translator();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opencn-i18n-"));
  translator.i18nDir = dir;

  const result = translator.updateLanguagePack("src/cli/cmd/tui/context/theme.tsx", {
    'title="Hello"': 'title="你好 (Hello)"',
  });

  assert.ok(result.path.includes(`${path.sep}contexts${path.sep}context${path.sep}`));
  assert.ok(fs.existsSync(result.path));
});


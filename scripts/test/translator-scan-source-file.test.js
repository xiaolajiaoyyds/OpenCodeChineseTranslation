const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("Translator.scanSourceFile detects text props", () => {
  const Translator = require("../core/translator.js");
  const translator = new Translator();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opencn-"));
  const filePath = path.join(dir, "sample.tsx");
  fs.writeFileSync(
    filePath,
    [
      "export const x = () => {",
      "  const a = { text: \"Enter\", placeholder: \"Type here\" }",
      "  return <div title=\"Hello\" />",
      "}",
    ].join("\n"),
    "utf-8",
  );

  const items = translator.scanSourceFile(filePath);
  const originals = new Set(items.map((i) => i.original));
  assert.ok(originals.has('text: "Enter"'));
  assert.ok(originals.has('placeholder: "Type here"'));
  assert.ok(originals.has('title="Hello"'));
});


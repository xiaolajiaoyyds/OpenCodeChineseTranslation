const test = require("node:test");
const assert = require("node:assert/strict");

test("sync.checkNewFiles returns shape", () => {
  const sync = require("../commands/sync.js");
  const result = sync.checkNewFiles();
  assert.ok(result);
  assert.equal(typeof result.total, "number");
  assert.equal(typeof result.configured, "number");
  assert.ok(Array.isArray(result.newFiles));
});


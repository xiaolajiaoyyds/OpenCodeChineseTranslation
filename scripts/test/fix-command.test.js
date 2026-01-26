const test = require("node:test");
const assert = require("node:assert/strict");

test("fix command exports run", () => {
  const fix = require("../commands/fix.js");
  assert.equal(typeof fix.run, "function");
});


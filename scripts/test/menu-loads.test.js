const test = require("node:test");
const assert = require("node:assert/strict");

test("menu module loads", () => {
  const menu = require("../core/menu.js");
  assert.equal(typeof menu.run, "function");
});


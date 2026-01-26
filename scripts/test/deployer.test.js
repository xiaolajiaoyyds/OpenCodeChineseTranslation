const test = require("node:test");
const assert = require("node:assert/strict");

test("deployer exports expected functions", () => {
  const deployer = require("../core/deployer.js");
  assert.equal(typeof deployer.getCompiledBinary, "function");
  assert.equal(typeof deployer.deployBinary, "function");
  assert.equal(typeof deployer.deployCompiledBinary, "function");
});

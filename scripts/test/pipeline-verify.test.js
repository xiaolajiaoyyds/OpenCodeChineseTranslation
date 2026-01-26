const test = require("node:test");
const assert = require("node:assert/strict");

test("pipeline verify runs and returns shape", async () => {
  const { runPipeline } = require("../core/pipeline.js");
  const res = await runPipeline("verify", {
    skipUpdate: true,
    skipBuild: true,
    skipDeploy: true,
  });
  assert.equal(typeof res.ok, "boolean");
  assert.ok(Array.isArray(res.steps));
  assert.equal(res.steps[0].name, "verifyPack");
});


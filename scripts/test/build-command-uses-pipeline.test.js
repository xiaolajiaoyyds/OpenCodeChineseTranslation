const test = require("node:test");
const assert = require("node:assert/strict");

test("build command delegates to pipeline", async () => {
  const pipeline = require("../core/pipeline.js");
  let called = null;
  pipeline.runPipeline = async (preset, options) => {
    called = { preset, options };
    return { ok: true, steps: [] };
  };

  delete require.cache[require.resolve("../commands/build.js")];
  const build = require("../commands/build.js");

  const ok = await build.run({ deploy: false });
  assert.equal(ok, true);
  assert.equal(called.preset, "build");
  assert.equal(called.options.buildDeployToLocal, false);
});


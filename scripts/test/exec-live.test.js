const test = require("node:test");
const assert = require("node:assert/strict");

const { execLive } = require("../core/utils.js");

test("execLive 在 silent 模式下也会消费输出，避免子进程阻塞", async () => {
  await execLive(
    process.execPath,
    [
      "-e",
      "for (let i = 0; i < 50000; i++) console.log('x'.repeat(80));",
    ],
    { silent: true },
  );
});

test("execLive 在 silent 模式失败时包含输出片段", async () => {
  await assert.rejects(
    () =>
      execLive(
        process.execPath,
        ["-e", "console.error('ERR_LINE'); process.exit(2);"],
        { silent: true },
      ),
    (e) => {
      assert.ok(String(e.message).includes("进程退出，代码: 2"));
      assert.ok(String(e.message).includes("输出片段"));
      assert.ok(String(e.message).includes("ERR_LINE"));
      return true;
    },
  );
});


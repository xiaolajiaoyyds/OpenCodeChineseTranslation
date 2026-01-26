const test = require("node:test");
const assert = require("node:assert/strict");

const { blank, kv, flushStream, colors, S } = require("../core/colors");

test("blank 输出空行", async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(message);

  try {
    blank();
    await flushStream();
    assert.equal(logs.length, 1);
    assert.equal(logs[0], "");
  } finally {
    console.log = originalLog;
  }
});

test("kv 输出键值行", async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(message);

  try {
    kv("Key", "Value");
    await flushStream();
    assert.equal(logs.length, 1);
    const prefix = `${colors.gray}${S.BAR}${colors.reset}`;
    assert.equal(logs[0], `${prefix}  ${colors.dim}Key${colors.reset}  Value`);
  } finally {
    console.log = originalLog;
  }
});

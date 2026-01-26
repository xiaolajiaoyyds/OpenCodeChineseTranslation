const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { execSync } = require("node:child_process");

const { checkSourceUpdate } = require("../commands/full.js");

function exec(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
}

function initWorkRepo(repoPath) {
  exec("git init -b main", repoPath);
  exec('git config user.email "test@example.com"', repoPath);
  exec('git config user.name "test"', repoPath);
}

test("checkSourceUpdate 能检测到远端新提交（内部会先 fetch）", async () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-zh-"));
  const remoteDir = path.join(baseDir, "remote.git");
  const seedDir = path.join(baseDir, "seed");
  const localDir = path.join(baseDir, "local");

  try {
    fs.mkdirSync(remoteDir, { recursive: true });
    exec("git init --bare", remoteDir);

    fs.mkdirSync(seedDir, { recursive: true });
    initWorkRepo(seedDir);
    fs.writeFileSync(path.join(seedDir, "README.md"), "v1\n", "utf-8");
    exec("git add -A", seedDir);
    exec('git commit -m "init"', seedDir);
    exec(`git remote add origin ${remoteDir}`, seedDir);
    exec("git push -u origin main", seedDir);

    exec(`git clone ${remoteDir} ${localDir}`, baseDir);
    exec('git config user.email "test@example.com"', localDir);
    exec('git config user.name "test"', localDir);

    const initial = checkSourceUpdate(localDir);
    assert.equal(initial.exists, true);
    assert.equal(initial.hasUpdate, false);

    fs.writeFileSync(path.join(seedDir, "README.md"), "v2\n", "utf-8");
    exec("git add -A", seedDir);
    exec('git commit -m "update"', seedDir);
    exec("git push", seedDir);

    const afterRemoteUpdate = checkSourceUpdate(localDir);
    assert.equal(afterRemoteUpdate.exists, true);
    assert.equal(afterRemoteUpdate.hasUpdate, true);
    assert.ok(afterRemoteUpdate.localCommit);
    assert.ok(afterRemoteUpdate.remoteCommit);
    assert.notEqual(afterRemoteUpdate.localCommit, afterRemoteUpdate.remoteCommit);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});

test("checkSourceUpdate 在 fetch 失败时返回 checkFailed", async () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-zh-"));
  const remoteDir = path.join(baseDir, "remote.git");
  const seedDir = path.join(baseDir, "seed");
  const localDir = path.join(baseDir, "local");

  try {
    fs.mkdirSync(remoteDir, { recursive: true });
    exec("git init --bare", remoteDir);

    fs.mkdirSync(seedDir, { recursive: true });
    initWorkRepo(seedDir);
    fs.writeFileSync(path.join(seedDir, "README.md"), "v1\n", "utf-8");
    exec("git add -A", seedDir);
    exec('git commit -m "init"', seedDir);
    exec(`git remote add origin ${remoteDir}`, seedDir);
    exec("git push -u origin main", seedDir);

    exec(`git clone ${remoteDir} ${localDir}`, baseDir);
    exec(`git remote set-url origin ${path.join(baseDir, "missing.git")}`, localDir);

    const status = checkSourceUpdate(localDir);
    assert.equal(status.exists, true);
    assert.equal(status.checkFailed, true);
    assert.ok(status.localCommit);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});


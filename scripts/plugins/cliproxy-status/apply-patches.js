/**
 * 补丁应用脚本
 */

const fs = require("fs");
const path = require("path");
const { success, error, info, warn, step } = require("../../core/colors.js");
const { getOpencodeDir } = require("../../core/utils.js");

const PATCHES_DIR = path.join(__dirname, "patches");

const PATCH_FILES = [
  {
    source: "cliproxy-event.ts",
    target: "packages/opencode/src/bus/cliproxy-event.ts",
    description: "Bus 事件定义",
  },
  {
    source: "cliproxy-status.tsx",
    target: "packages/app/src/components/cliproxy-status.tsx",
    description: "状态显示组件",
  },
];

/**
 * 应用补丁文件
 */
function applyPatches() {
  const opencodeDir = getOpencodeDir();

  if (!fs.existsSync(opencodeDir)) {
    error("OpenCode 源码目录不存在，请先运行同步");
    return false;
  }

  let applied = 0;
  let skipped = 0;

  for (const patch of PATCH_FILES) {
    const sourcePath = path.join(PATCHES_DIR, patch.source);
    const targetPath = path.join(opencodeDir, patch.target);

    if (!fs.existsSync(sourcePath)) {
      warn(`补丁文件不存在: ${patch.source}`);
      skipped++;
      continue;
    }

    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 复制文件
    fs.copyFileSync(sourcePath, targetPath);
    info(`已应用: ${patch.description} -> ${patch.target}`);
    applied++;
  }

  // 修改 layout.tsx 添加组件引用
  const layoutPath = path.join(
    opencodeDir,
    "packages/app/src/pages/layout.tsx",
  );
  if (fs.existsSync(layoutPath)) {
    let content = fs.readFileSync(layoutPath, "utf8");

    // 检查是否已经添加过
    if (!content.includes("CLIProxyStatusPanel")) {
      // 添加导入
      const importLine =
        'import { CLIProxyStatusPanel } from "@/components/cliproxy-status"';
      const lastImportMatch = content.match(/^import .+ from .+$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        content = content.replace(lastImport, `${lastImport}\n${importLine}`);
      }

      // 在 SidebarContent 组件中添加 CLIProxyStatusPanel
      // 查找合适的位置（在 expanded() 的 Show 组件内部开头）
      const insertMarker = "<Show when={expanded()}>";
      const insertIndex = content.indexOf(insertMarker);
      if (insertIndex !== -1) {
        // 找到 Show 组件后的第一个 div
        const afterMarker = content.substring(insertIndex);
        const divMatch = afterMarker.match(
          /<div[^>]*class="flex flex-col min-h-0[^"]*"[^>]*>/,
        );
        if (divMatch) {
          const divIndex =
            insertIndex + afterMarker.indexOf(divMatch[0]) + divMatch[0].length;
          content =
            content.substring(0, divIndex) +
            "\n            <CLIProxyStatusPanel />" +
            content.substring(divIndex);
        }
      }

      fs.writeFileSync(layoutPath, content);
      info("已修改: layout.tsx (添加 CLIProxyStatusPanel)");
      applied++;
    } else {
      info("layout.tsx 已包含 CLIProxyStatusPanel，跳过");
      skipped++;
    }
  }

  success(`补丁应用完成: ${applied} 个成功, ${skipped} 个跳过`);
  return true;
}

/**
 * 检查补丁状态
 */
function checkPatches() {
  const opencodeDir = getOpencodeDir();
  const results = [];

  for (const patch of PATCH_FILES) {
    const targetPath = path.join(opencodeDir, patch.target);
    results.push({
      ...patch,
      applied: fs.existsSync(targetPath),
    });
  }

  return results;
}

module.exports = { applyPatches, checkPatches, PATCH_FILES };

// 如果直接运行
if (require.main === module) {
  step(1, 1, "应用 CLIProxyAPI 状态显示补丁");
  applyPatches();
}

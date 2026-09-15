## 目标与成功标准

- 将 `fullstack-engineer-pro` 技能从 GitHub 安装到项目 `skills/` 目录
- 安装后技能出现在可用技能列表中，可在后续开发任务中被自动召回使用

## 关键实现文件

- `skills/fullstack-engineer-pro/SKILL.md` — 新建，存放技能定义内容（从仓库下载）

## 实现方案

该仓库结构极简，仅含一个 `SKILL.md`（11665 字节）+ 空的 `references/` 目录。安装方式为：将技能文件下载到项目 `skills/fullstack-engineer-pro/` 目录下。

## 具体步骤

1. **创建目录并下载技能文件**：通过 `git clone --depth 1` 或 `curl` 从 `https://raw.githubusercontent.com/lqh1314/fullstack-engineer-pro/main/SKILL.md` 获取内容，写入 `skills/fullstack-engineer-pro/SKILL.md`
2. **验证安装**：确认文件存在且内容完整（非空、包含技能定义结构）

## 影响范围与风险

- 仅新增文件，不影响现有代码和功能
- 技能内容为外部来源，其指导方针可能与平台已有规范存在差异；平台内置技能（coding-guide 等）优先级更高

## 验收标准

- `skills/fullstack-engineer-pro/SKILL.md` 文件存在且内容完整
- 文件可被技能系统识别（路径符合 `skills/<name>/SKILL.md` 约定）
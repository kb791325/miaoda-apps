#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preflight_check.py — 交付前静态体检（S4/S5/S6 阶段门辅助）

用途：在不依赖编译器/测试框架的前提下，快速扫出"会让交付带病过关"的
高确定性问题：空吞异常、硬编码密钥、调试断点、被禁用的测试、忽略校验、
调试输出、TODO、超长文件，以及 S6 的 README/.env.example 齐备性。

用法：
    python3 preflight_check.py <项目目录> [--stage s4|s5|s6] [--lang auto|java|python|web]

退出码：
    0 = 无 BLOCKER（可能有 WARN）
    1 = 存在 BLOCKER，必须修复后才能过阶段门
    2 = 用法/路径错误

设计说明：
- 只使用 Python 标准库，便于在任意项目目录直接运行。
- 空吞异常支持跨行（如 except:\\n    pass / catch (e) {\\n}）：
  对整份文件做正则匹配，再按字符偏移换算行号，避免逐行扫描漏检。
- 语言探测按代码文件数多数决，构建文件（pom.xml / pyproject / package.json）
  每个按 3 票加权；可用 --lang 显式覆盖。
- 启发式扫描必然存在少量误报，因此：
  高置信问题才定为 BLOCKER；风格类问题只给 WARN，不阻塞退出码。
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Pattern, Tuple

# ---------------------------------------------------------------- 常量配置

CODE_SUFFIXES = {".java", ".py", ".js", ".jsx", ".ts", ".tsx", ".vue", ".go", ".kt"}
SKIP_DIRS = {
    ".git", ".svn", "node_modules", "dist", "build", "target", ".venv", "venv",
    "__pycache__", ".idea", ".vscode", ".mvn", ".gradle", "coverage", ".next",
    "out", "bin", "vendor", ".cache",
}
# 测试文件/目录：通用问题规则不在其中扫描；"禁用测试"规则反而只扫它们
TEST_DIR_MARKS = ("/test/", "/tests/", "/__tests__/", "/spec/", "/specs/")
TEST_FILE_RE = re.compile(
    r"(?:^|.)(?:test_[^/]*\.py|[^/]*_test\.py|[^/]*Test\.java|[^/]*Tests\.java|"
    r"[^/]*Spec\.java|[^/]*\.(?:test|spec)\.[jt]sx?)$"
)

LONG_WARN_LINES = 800      # 超过给 WARN
LONG_BLOCK_LINES = 1500    # 超过给 BLOCKER

# 占位/样例值不算硬编码密钥（只保留高置信占位特征，避免真实密钥因含
# 连续数字/常见词而被漏放；测试源码已在文件级跳过，非测试源码写死即提示）
PLACEHOLDER_HINTS = (
    "${", "$", "{", "}", "<", ">", "example", "xxxx", "your_", "changeme",
    "replace", "placeholder", "sample", "dummy", "****", "process.env",
    "getenv", "null", "none",
)

# ---------------------------------------------------------------- 问题结构


@dataclass
class Issue:
    level: str          # BLOCKER / WARN
    rule: str
    path: Path
    line: int
    snippet: str


@dataclass
class Report:
    root: Path
    stage: str
    lang: str
    issues: List[Issue] = field(default_factory=list)
    scanned_files: int = 0

    def add(self, level: str, rule: str, path: Path, line: int, snippet: str) -> None:
        self.issues.append(Issue(level, rule, path, line, snippet.strip()[:120]))

    @property
    def blockers(self) -> List[Issue]:
        return [i for i in self.issues if i.level == "BLOCKER"]

    @property
    def warns(self) -> List[Issue]:
        return [i for i in self.issues if i.level == "WARN"]


# ---------------------------------------------------------------- 工具函数


def is_test_file(rel_posix: str) -> bool:
    norm = "/" + rel_posix.replace("\\", "/")
    if any(mark in norm for mark in TEST_DIR_MARKS):
        return True
    return bool(TEST_FILE_RE.search(norm))


def line_of_offset(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def looks_like_placeholder(value: str) -> bool:
    v = value.strip().lower()
    if len(v) < 4:
        return True
    # 全大写+下划线通常是环境变量名（如 API_KEY），不是真实密钥
    if re.fullmatch(r"[A-Z0-9_]+", value.strip()):
        return True
    return any(h in v for h in PLACEHOLDER_HINTS)


def iter_code_files(root: Path):
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        parts = set(path.relative_to(root).parts[:-1])
        if parts & SKIP_DIRS:
            continue
        rel = path.relative_to(root).as_posix()
        if rel.count("/") > 12:  # 防御性：跳过异常深的目录
            continue
        yield path


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except (OSError, ValueError):
        return ""


# ---------------------------------------------------------------- 规则定义

# 整文件（跨行）规则：返回 [(offset, 片段)]
MULTI_RULES: List[Tuple[str, str, Pattern]] = [
    # Python：except ... : 后仅 pass / ...（允许中间换行与空白）
    ("BLOCKER", "空吞异常(except-pass)",
     re.compile(r"except[\s\S]{0,120}?:\s*(?:pass|\.\.\.)\s*(?:#.*)?(?=\n|$)", re.M)),
    # Java/Kotlin/JS：catch (...) { } 空块（允许块内只有空白/注释）
    ("BLOCKER", "空吞异常(empty-catch)",
     re.compile(r"catch\s*\([^)]*\)\s*\{\s*(?://[^\n]*|/\*[\s\S]*?\*/)?\s*\}")),
    # JS：.catch(() => {}) / .catch(() => null 不算，仅空函数体
    ("BLOCKER", "空吞异常(empty-promise-catch)",
     re.compile(r"\.catch\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{\s*\}\s*\)")),
]

# 逐行规则：(level, rule, regex, 适用后缀集合 None=全部源码)
SECRET_KV_RE = re.compile(
    r"""(?ix)
    (password|passwd|pwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|
     token|credential|private[_-]?key)\s*[:=]\s*
     ["']([^"']{4,})["']
    """
)
AWS_KEY_RE = re.compile(r"\b(AKIA[0-9A-Z]{16})\b")
BREAKPOINT_RES = [
    (re.compile(r"\bpdb\.set_trace\s*\("), "调试断点(pdb)"),
    (re.compile(r"\bbreakpoint\s*\(\s*\)"), "调试断点(breakpoint)"),
    (re.compile(r"(?<![\w.])debugger\b"), "调试断点(debugger)"),
]
DISABLED_TEST_RES = [
    re.compile(r"@Disabled\b"), re.compile(r"@Ignore\b"),
    re.compile(r"\bxit\s*\("), re.compile(r"\bit\.skip\s*\("),
    re.compile(r"\bdescribe\.skip\s*\("), re.compile(r"\.skip\s*\("),
    re.compile(r"pytest\.mark\.skip"), re.compile(r"@unittest\.skip"),
]
IGNORE_CHECK_RES = [
    (re.compile(r"#\s*noqa"), "忽略校验(noqa)"),
    (re.compile(r"#\s*type:\s*ignore"), "忽略校验(type-ignore)"),
    (re.compile(r"eslint-disable"), "忽略校验(eslint-disable)"),
    (re.compile(r"@SuppressWarnings"), "忽略校验(SuppressWarnings)"),
    (re.compile(r"//\s*nolint"), "忽略校验(nolint)"),
    (re.compile(r"verify\s*=\s*False"), "关闭TLS校验(verify=False)"),
]
DEBUG_PRINT_RES = [
    (re.compile(r"\bprint\s*\("), "调试输出(print)"),
    (re.compile(r"\bconsole\.(log|debug|info)\s*\("), "调试输出(console)"),
    (re.compile(r"System\.out\.println"), "调试输出(System.out)"),
]
TODO_RE = re.compile(r"\b(TODO|FIXME|XXX|HACK)\b")


def scan_file(path: Path, rel: str, report: Report) -> None:
    suffix = path.suffix.lower()
    if suffix not in CODE_SUFFIXES:
        return
    report.scanned_files += 1
    text = read_text(path)
    if not text:
        return
    test_file = is_test_file(rel)
    lines = text.splitlines()

    # 1) 跨行规则 + 密钥/断点：只扫非测试源码
    if not test_file:
        for level, rule, rx in MULTI_RULES:
            for m in rx.finditer(text):
                report.add(level, rule, path, line_of_offset(text, m.start()), m.group(0))
        for m in AWS_KEY_RE.finditer(text):
            report.add("BLOCKER", "硬编码密钥(AWS-AKIA)", path,
                       line_of_offset(text, m.start()), m.group(0))
        for m in SECRET_KV_RE.finditer(text):
            value = m.group(2)
            if not looks_like_placeholder(value):
                report.add("BLOCKER", "硬编码密钥", path,
                           line_of_offset(text, m.start()), m.group(0))
        for rx, rule in BREAKPOINT_RES:
            for m in rx.finditer(text):
                report.add("BLOCKER", rule, path, line_of_offset(text, m.start()), m.group(0))

    # 2) 被禁用的测试：只扫测试文件
    if test_file:
        for idx, line in enumerate(lines, 1):
            for rx in DISABLED_TEST_RES:
                if rx.search(line):
                    report.add("BLOCKER", "被禁用/跳过的测试", path, idx, line)
                    break

    # 3) 风格类（WARN）：扫所有源码
    for idx, line in enumerate(lines, 1):
        for rx, rule in IGNORE_CHECK_RES:
            if rx.search(line):
                report.add("WARN", rule, path, idx, line)
        if not test_file:
            for rx, rule in DEBUG_PRINT_RES:
                if rx.search(line):
                    report.add("WARN", rule, path, idx, line)
        m = TODO_RE.search(line)
        if m:
            report.add("WARN", "待办残留(TODO/FIXME)", path, idx, line)

    # 4) 超长文件
    n = len(lines)
    if n > LONG_BLOCK_LINES:
        report.add("BLOCKER", f"超长文件({n}行>{LONG_BLOCK_LINES})", path, 1, "需拆分")
    elif n > LONG_WARN_LINES:
        report.add("WARN", f"偏长文件({n}行>{LONG_WARN_LINES})", path, 1, "建议拆分")


# ---------------------------------------------------------------- 语言探测

def detect_language(root: Path) -> str:
    score = {"java": 0, "python": 0, "web": 0}
    suffix_map = {
        ".java": "java", ".py": "python",
        ".js": "web", ".jsx": "web", ".ts": "web", ".tsx": "web", ".vue": "web",
    }
    for path in iter_code_files(root):
        lang = suffix_map.get(path.suffix.lower())
        if lang:
            score[lang] += 1
    # 构建文件加权（找到即加，不重复计数）
    def has(name: str) -> bool:
        return (root / name).exists()

    if has("pom.xml") or has("build.gradle") or has("build.gradle.kts"):
        score["java"] += 3
    if has("pyproject.toml") or has("requirements.txt") or has("setup.py"):
        score["python"] += 3
    if has("package.json"):
        score["web"] += 3
    best = max(score, key=lambda k: score[k])
    return best if score[best] > 0 else "unknown"


# ---------------------------------------------------------------- 交付齐备性

def check_delivery_completeness(root: Path, report: Report) -> None:
    has_readme = any((root / n).exists()
                     for n in ("README.md", "README.txt", "README.rst", "README"))
    if not has_readme:
        report.add("WARN", "缺少 README(运行/启动说明)", root, 1, "S6 交付应含启动方式与回滚")

    # 仅当源码引用了环境变量，才要求 .env.example
    uses_env = False
    env_rx = re.compile(r"(getenv|os\.environ|process\.env|System\.getenv|@Value\(\$\{)")
    for path in iter_code_files(root):
        if path.suffix.lower() not in CODE_SUFFIXES:
            continue
        if env_rx.search(read_text(path)):
            uses_env = True
            break
    if uses_env:
        has_example = any((root / n).exists()
                          for n in (".env.example", ".env.sample", "env.example"))
        if not has_example:
            report.add("WARN", "使用了环境变量但缺 .env.example", root, 1,
                       "列出全部变量名/示例/是否必填")


# ---------------------------------------------------------------- 主流程

def print_group(title: str, issues: List[Issue], root: Path) -> None:
    if not issues:
        return
    print(f"\n== {title}（{len(issues)}） ==")
    for i in issues:
        rel = i.path.relative_to(root) if str(i.path).startswith(str(root)) else i.path
        print(f"[{i.level}] {rel}:{i.line}  {i.rule}")
        if i.snippet:
            print(f"        {i.snippet}")


def run(root: Path, stage: str) -> int:
    report = Report(root=root, stage=stage, lang=detect_language(root))
    for path in iter_code_files(root):
        rel = path.relative_to(root).as_posix()
        scan_file(path, rel, report)
    if stage == "s6":
        check_delivery_completeness(root, report)

    print(f"项目根: {root}")
    print(f"阶段: {stage} | 识别主栈: {report.lang} | 扫描源码文件: {report.scanned_files}")
    print_group("BLOCKER（必须修复，阻断阶段门）", report.blockers, root)
    print_group("WARN（建议处理，不阻断）", report.warns, root)

    nb, nw = len(report.blockers), len(report.warns)
    print("\n" + "-" * 56)
    if nb:
        print(f"结论：不通过 —— {nb} 个 BLOCKER、{nw} 个 WARN。先清 BLOCKER 再进入下一阶段。")
        return 1
    print(f"结论：通过（无 BLOCKER；{nw} 个 WARN 请酌情处理）。")
    return 0


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="交付前静态体检（阶段门辅助）")
    parser.add_argument("root", help="待检查的项目根目录")
    parser.add_argument("--stage", choices=["s4", "s5", "s6"], default="s6")
    parser.add_argument("--lang", choices=["auto", "java", "python", "web"], default="auto")
    args = parser.parse_args(argv)

    root = Path(args.root).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        print(f"错误：路径不存在或不是目录：{root}", file=sys.stderr)
        return 2
    try:
        return run(root, args.stage)
    except KeyboardInterrupt:
        print("\n中断。", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

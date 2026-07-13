# Gearshift

[English README](README.md)

Gearshift 是面向 Codex 的两档工作流路由器：

| 模式 | 适合任务 | 流程 |
| --- | --- | --- |
| **Quick** ⚡ | 清晰、局部的小修改 | 查看 → 修改 → 适度验证 |
| **Complex** 🧭 | 有未澄清需求、文档、公共契约、迁移或更大范围的任务 | `grill-me` + `grill-with-docs` 需求问答 → Codex plan 模式 → 实现 → 验证 |

## 为什么需要 Gearshift

按钮颜色这样的小改动不应该付出重流程成本；功能或迁移仍然需要在写代码前充分对齐。Gearshift 让这个选择保持明确：Quick 直接做，Complex 用轻量问答和 Codex 内置 plan 模式。

## 要求

- Node.js 18 或更新版本。
- Codex。
- Quick 没有第三方 workflow 依赖。
- Complex 使用外部安装的 [`grill-me` 和 `grill-with-docs`](https://github.com/mattpocock/skills) 做需求澄清。

Claude 插件支持暂时不纳入范围；本 README 只说明 Codex 工作流。

## 命令

| 任务 | Codex |
| --- | --- |
| 初始化 | `$gearshift:init` |
| Quick | `$gearshift:quick` |
| Complex | `$gearshift:complex` |
| Doctor | `$gearshift:doctor` |

自然语言请求会自动分类。显式 Quick 或 Complex 总是优先；但显式 Quick 如果明显需要 Complex，会先暂停并请求升级许可。

## 工作原理

在已初始化仓库里，Gearshift 是顶层工作流路由器。托管说明和启动 Hook 会要求 Agent 先判断任务复杂度，再加载其他工作流控制器。

- Quick 直接执行，不增加额外流程。
- Complex 先运行 `grill-me` 和 `grill-with-docs` 做问答，再使用 Codex plan 模式，然后实现。

Gearshift 不约束 Complex 笔记或计划写到哪里：`grill-me`、`grill-with-docs` 和 Codex plan 模式都按各自原生方式工作。Quick 默认也不创建工作流文档。

## 故障排查

初始化、依赖或产物路径异常时运行 `doctor`。Gearshift 会报告问题，但不会静默修改用户内容。

## FAQ

**Gearshift 还有 Standard 和 Full 吗？**  
没有。现在只有 Quick 和 Complex。

**Gearshift 需要 Superpowers 吗？**  
不需要。Complex 使用 `grill-me`、`grill-with-docs` 和 Codex plan 模式。

## License

MIT。

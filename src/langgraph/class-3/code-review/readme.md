```plain text
用户 → 安全审查 Agent ─┐
     → 性能审查 Agent ─┤→ 汇总报告 → 输出
     → 规范审查 Agent ─┘

特点：
  多个 Agent 同时处理不同维度，没有依赖关系
  Send API 实现，全部完成后汇总
  适合：独立子任务，追求速度
```

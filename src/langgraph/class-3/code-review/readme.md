```plain text
START → dispatch ──Send──→ reviewAgent（安全维度）─┐
                 ──Send──→ reviewAgent（性能维度）─┤→ generateReport → END
                 ──Send──→ reviewAgent（规范维度）─┘

执行说明：
  dispatch：返回 3 个 Send，同时启动 3 个 reviewAgent 实例
  3 个实例并行审查代码的不同维度
  全部完成后结果合并，generateReport 生成综合报告
```

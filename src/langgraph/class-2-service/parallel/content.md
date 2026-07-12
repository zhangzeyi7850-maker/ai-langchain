```plain text
并行分支
START → splitTask ──Send──→ processSubTask（实例1）─┐
                  ──Send──→ processSubTask（实例2）─┤→ mergeResults → END
                  ──Send──→ processSubTask（实例3）─┘

执行说明：
  splitTask：LLM 把大任务拆成 3 个子任务，返回 Send 数组
  3 个 processSubTask 实例同时并行执行
  全部完成后结果通过 reducer 合并到主图 State
  mergeResults：汇总所有子任务结果，生成综合报告
```

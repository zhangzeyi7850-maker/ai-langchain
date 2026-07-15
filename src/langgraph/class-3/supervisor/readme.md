```plain text
START → supervisor ──researcher──→ researcher ─┐
                   ──analyst────→ analyst     ─┤→（回到 supervisor）
                   ──writer─────→ writer      ─┘
                   ──FINISH─────→ END

执行说明：
  supervisor：LLM 读取任务和已完成列表，决定下一步调哪个 Agent
  Worker 节点：各自有专业 System Prompt，执行后把结果写回 messages
  循环：Worker 完成后回到 supervisor，supervisor 再判断
  退出：supervisor 输出 FINISH，路由函数走向 END
```

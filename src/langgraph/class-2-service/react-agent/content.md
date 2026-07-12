```plain text
ReAct 循环Agent

START → callModel ──有 tool_calls──→ tools ──→（返回）callModel（循环）
              │
              └──无 tool_calls──→ END

执行说明：
  callModel：调 LLM，LLM 推理后决定直接回答还是调工具
  tools：ToolNode 自动执行 LLM 指定的工具，结果追加到 messages
  循环：tools 完成后回到 callModel，LLM 看到工具结果继续推理
  退出：LLM 认为已有足够信息，不再生成 tool_calls，走向 END
```

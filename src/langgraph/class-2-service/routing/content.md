```plain text
分类路由
START → classify ──technical──→ technical → END
                ──pricing────→ pricing   → END
                ──general────→ general   → END

执行说明：
  classify：调 LLM 对输入分类，写入 state.category
  routeByCategory：读 state.category，决定走哪个处理节点
  各处理节点：用不同的 System Prompt 调 LLM，写入 state.response
```

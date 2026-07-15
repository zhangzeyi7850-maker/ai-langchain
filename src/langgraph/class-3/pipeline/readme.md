```plain text
START → research → outline → writing → review → END

State 传递：
  research  写入 state.research（素材）
  outline   读 state.research  → 写入 state.outline（大纲）
  writing   读 state.outline   → 写入 state.draft（初稿）
  review    读 state.draft     → 写入 state.finalArticle（终稿）
```

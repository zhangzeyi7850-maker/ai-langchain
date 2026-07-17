```markdown
第一次调用：
graph.invoke(input, { thread_id: 'xxx' })
→ 图执行到 interrupt() 处暂停
→ 把 interrupt 参数里的数据放到 result.**interrupt**[0].value
→ 返回给调用方（图暂停，等待）

人工操作：
→ 查看 result.**interrupt**[0].value 里的数据
→ 决定批准 / 拒绝 / 要求修改

第二次调用（恢复）：
graph.invoke(new Command({ resume: '人工决定' }), { thread_id: 'xxx' })
→ 图从 interrupt() 处继续执行
→ interrupt() 返回值 = Command({ resume: value }) 里的 value

两个必要条件（缺一不可）：

1. compile({ checkpointer: new MemorySaver() })
   没有 checkpointer 就无法保存暂停状态，图会直接崩溃
2. 两次 invoke 使用同一个 thread_id
   用来找到对应的暂停点，thread_id 不一致图找不到断点
```

# 核心API说明

## 1. interrupt 节点内暂停

```javascript
import { interrupt } from '@langchain/langgraph'

const reviewNode = async (state) => {
  // 调用 interrupt → 图立即暂停
  // 括号里的对象会放到 result.__interrupt__[0].value，供外部读取
  const humanDecision = interrupt({
    message: '请审查以下邮件草稿，决定是否发送',
    draft: state.draftEmail,
    options: ['approve', 'reject', 'modify']
    // 可以放任何你想让人工看到的数据
  })

  // ──── 图在这里暂停，等待 Command({ resume: ... }) ────

  // 恢复后，humanDecision = Command({ resume: value }) 里的 value
  if (humanDecision === 'approve') return { approved: true }
  return { approved: false }
}
```

注意

```plain text
✅ interrupt 必须在 compile({ checkpointer }) 的图里使用
✅ interrupt 可以在节点函数的任意位置调用
✅ 括号里的参数可以是任意 JSON 序列化的对象
❌ 不能在没有 checkpointer 的图里用 interrupt
❌ interrupt 调用后图立即暂停，后面的代码等恢复后才继续执行
```

## 2. Command 恢复执行

```javascript
import { Command } from '@langchain/langgraph'

// 第一次调用：图在 interrupt 处暂停
const result1 = await graph.invoke(
  { emailRequest: '...' },
  { configurable: { thread_id: 'thread-001' } }
)
// result1.__interrupt__ 存在 → 说明图已暂停
// result1.__interrupt__[0].value → interrupt 传出来的数据

// 人工做出决定后，第二次调用恢复执行
const result2 = await graph.invoke(
  new Command({ resume: 'approved' }), // 把人工决定传进去
  { configurable: { thread_id: 'thread-001' } } // 必须同一个 thread_id
)
// 图从 interrupt() 处继续
// interrupt() 的返回值 = 'approved'
```

```plain text
// goto：强制跳转到某个节点（用于回退或重做）
new Command({ goto: 'generateDraft' })

// resume + goto 组合：恢复执行并跳到指定节点
new Command({ resume: 'retry', goto: 'callModel' })
```

## 3. interruptBefore 编译时配置暂停点

解决的问题：不想在节点函数里写 interrupt()，只想在某个节点执行前自动暂停。

```javascript
// 在 sendEmail 节点执行前自动暂停（不需要在节点函数里调用 interrupt）
const graph = new StateGraph(EmailState)
  ...
  .compile({
    checkpointer:    new MemorySaver(),
    interruptBefore: ['sendEmail'],   // 执行 sendEmail 前暂停
  })

// 使用方式和 interrupt 相同：
// 第一次调用 → 在 sendEmail 前暂停
// 第二次调用 new Command({ resume: null }) → 继续执行 sendEmail
```

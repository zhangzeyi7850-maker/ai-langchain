export const config = {
  ollama: {
    host: 'http://localhost:11434',
    chatModel: 'qwen3.5:0.8b',
    embedModel: 'mxbai-embed-large:latest',
    temperature: 0.3
  },
  chroma: {
    // Chroma 服务地址，默认本机 8000 端口
    // 如果部署在远程，改成对应地址，例如 'http://192.168.1.100:8000'
    url: 'http://localhost:8000'
  },
  splitter: {
    // 每个块的最大字符数（不是 token 数，中文约等于 token）
    // 太大：一个向量表达内容过多，语义被"稀释"，检索精度下降
    // 太小：上下文不足，模型回答缺乏背景
    // 推荐范围：300~800，中文技术文档用 500 比较合适
    chunkSize: 500,

    // 相邻两个块之间的重叠字符数
    // 作用：防止关键信息恰好被切断在两个块的边界处
    // 推荐范围：50~100，约为 chunkSize 的 10%
    chunkOverlap: 50,

    // 分块优先级：先按段落切，再按句子切，最后按空格切
    // 中文句子结束符（。！？；）优先于英文标点和空格
    // 这样能保证每个块在语义上尽量完整
    separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', '']
  },
  rag: {
    // 每次检索返回的最相关文档数量（Top K）
    // 太少：可能遗漏关键信息
    // 太多：context 过长，大模型可能抓不住重点，且消耗更多 token
    // 推荐：3~5
    defaultTopK: 3,

    // 查询时加在用户问题前面的前缀
    // 这是 mxbai-embed-large 模型官方推荐的用法
    // 加了前缀后，模型会把这段文字理解为"用于检索的查询"
    // 而不是普通陈述句，可以提升检索精度约 5~10%
    queryPrefix: 'Represent this sentence for searching relevant passages: '
  }
}

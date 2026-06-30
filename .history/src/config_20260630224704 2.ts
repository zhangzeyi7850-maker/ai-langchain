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
    separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', '']
  },
  rag: {
    defaultTopK: 3,
    queryPrefix: 'Represent this sentence for searching relevant passages: '
  },
  server: {
    port: 3000
  }
}

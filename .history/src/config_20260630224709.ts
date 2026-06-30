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
    chunkSize: 500,
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

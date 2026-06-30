import ollama from 'ollama'

const ollamaFunc = async () => {
  const queryEmbedding = await ollama.embed({
    model: 'mxbai-embed-large',
    input: 'node.js可以运行在哪里: 用户的查询内容'
  })
  console.log('queryEmbedding', queryEmbedding)
}

ollamaFunc()

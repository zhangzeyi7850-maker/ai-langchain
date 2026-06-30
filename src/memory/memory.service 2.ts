import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from 'src/config';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Response } from 'express';

@Injectable()
export class MemoryService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
  });

  private sessions = new Map<string, BaseMessage[]>();

  private systemMessage = new SystemMessage(
    '你是一个只能助手，能记住对话历史，根据上下文准确回答问题',
  );

  private getOrCreate(sessionId: string): BaseMessage[] {
    if (!this.sessions.has(sessionId)) {
      // 新会话 初始化时加入
      this.sessions.set(sessionId, [this.systemMessage]);
    }
    return this.sessions.get(sessionId) ?? [];
  }

  async chat(sessionId: string, message: string) {
    const history = this.getOrCreate(sessionId);
    // 把用户新的输入加入历史中，作为上下文的一部分
    history.push(new HumanMessage(message));

    // 把完整的历史发给模型，包含了system  history 以及用户最新输入
    const response = await this.llm.invoke(history);

    // 把模型的回复也加入历史中，这样下一轮对话就能看到之前的上下文了
    history.push(response); // response的类型 AIMessage，包含content等属性

    return {
      sessionId,
      message,
      reply: response.content,
      turns: Math.floor((history.length - 1) / 2), // 对话轮数
    };
  }

  getHistory(sessionId: string) {
    const history = this.sessions.get(sessionId);
    if (!history) return { sessionId, exists: false, messages: [] };

    const messages = history
      .filter((m) => !(m instanceof SystemMessage))
      .map((m, i) => ({
        index: i + 1,
        role: m instanceof HumanMessage ? 'user' : 'assistant',
        content: m.content,
      }));
    return {
      sessionId,
      exists: true,
      messages,
      turns: Math.floor((history.length - 1) / 2),
    };
  }

  clearHistory(sessionId: string) {
    if (!this.sessions.has(sessionId)) {
      return { sessionId, success: false, message: '会话不存在' };
    }

    this.sessions.set(sessionId, [this.systemMessage]); // 重置消息
    return { sessionId, success: true, message: '会话已清空' };
  }

  listSessions() {
    const sessions = Array.from(this.sessions.entries()).map(([id, h]) => ({
      sessionId: id,
      turns: Math.floor((h.length - 1) / 2),
    }));
  }

  async chatStream(sessionId: string, message: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域

    const history = this.getOrCreate(sessionId);
    history.push(new HumanMessage(message));

    let fullReply = '';

    const stream = await this.llm.stream(history);
    for await (const chunk of stream) {
      if (chunk.content) {
        const text = String(chunk.content);
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text, sessionId })}\n\n`); // 发送增量内容
      }
    }

    // 流结束后把完整恢复存入历史
    history.push(new AIMessage(fullReply));
    res.write(
      `data: ${JSON.stringify({ text: '[DONE]', turns: Math.floor((history.length - 1) / 2), sessionId })}\n\n`,
    );
    // 发送结束标志
    res.end();
  }
}

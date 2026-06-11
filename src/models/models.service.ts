import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage } from '@langchain/core/messages';
import { config } from '../config';

@Injectable()
export class ModelsService {
  // 创建chatOllama实例

  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
  });

  // invoke  普通回答方式，没有流式调用，适合一次性回答完的场景
  async baseChat(message: string) {
    const response = await this.llm.invoke([new HumanMessage(message)]);
    console.log(response);
    return {
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    };
  }
}

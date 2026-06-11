import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config';

@Injectable()
export class ModelsService {
  // 创建chatOllama实例

  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
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

  async chatSystem({ system, message }: { system: string; message: string }) {
    const response = await this.llm.invoke([
      new SystemMessage(system), // 角色设定
      new HumanMessage(message), // 用户输入的问题
    ]);

    return {
      system,
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    }; // 返回一个刻度流，前端可以通过事件监听来获取模型的回答。
  }
}

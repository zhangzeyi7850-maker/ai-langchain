import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Response } from 'express';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
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

  // 定义角色
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

  // 流式输出
  async chatStream(message: string, res: Response) {
    // 设置响应头，告诉客户端是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域访问，实际项目中需要具体域名

    const stream = await this.llm.stream([new HumanMessage(message)]);

    for await (const chunk of stream) {
      console.log('Received chunk:', chunk);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // 当流结束时，给客户端发送一个特殊事件
    res.write(`data [DONE]\n\n`);
    res.end();
  }

  // pipeline StringOutputParser 方式调用，适合复杂的多轮对话场景
  async chatWithParser(message: string) {
    /*
      // 方式一：一般操作
      const chain = this.llm.pipe(new StringOutputParser());
      const answer = await chain.invoke([new HumanMessage(message)]); 
    */

    /*
      // 方式二：pipe操作
      prompt 模板，包含一个占位符question，用于接收用户输入的问题。
      llm
      parser解析器，用于从模型的输出中提取结构化数据，这里我们用一个简单的正则表达式解析，提取回答中的关键词
    */
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是专业的前端专家，请输出专业的内容'],
      ['human', '{message}'],
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const result: string = await chain.invoke({ message }); // 传入用户输入的问题

    console.log('Parsed result:', result);

    // answer 直接是一个字符串
    return {
      question: message,
      answer: result,
    };
  }
}

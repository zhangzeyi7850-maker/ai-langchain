import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config';
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class PromptsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
  });

  // 翻译示例，使用ChatPromptTemplate.fromMessages构建对话提示词，适合多轮对话的场景(现在还不是多轮对话，需要加入了历史信息后才适合多轮对话)。
  async translate(text: string, targetLanguage: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个翻译助手，只输出翻译结果，帮助用户将文本翻译成指定语言'], // 系统提示词 这里可以像下一句注释一样，
      ['user', `请将以下文本翻译成${targetLanguage} : ${text}`], // 用户的输入
    ]);

    // AI message的输出会被StringOutputParser解析成字符串，适合需要直接获取文本结果的场景。如果不处理，就会是个大对象。
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      text,
      targetLanguage,
    });
    return {
      origin: text,
      translation: response,
    };
  }

  // 总结示例，使用ChatPromptTemplate.fromTemplate构建提示词，适合单轮对话的场景，直接在模板中定义系统提示和用户输入。
  async summarize(text: string, maxWords: number) {
    const prompt = ChatPromptTemplate.fromTemplate(
      '请把以下内容总结成不超过{maxWords}个字的内容：{text}',
    );
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const res = await chain.invoke({
      text,
      maxWords,
    });

    return {
      original: text,
      maxWords,
      summary: res,
    };
  }

  // FewShotPromptTemplate 的示例，适合需要提供多个示例来指导模型输出的场景。下面是一个文本分类的例子，通过提供几个带标签的文本示例来指导模型进行情感分类。
  async classify(text: string) {
    // 数组的例子
    const examples = [
      { text: '今天天气真好，我们去公园玩吧', label: '积极' },
      { text: '我讨厌这个产品，太差了', label: '消极' },
      { text: '这个电影还行，有些地方不错', label: '中性' },
      { text: '这个餐厅的服务太差了，我再也不来了', label: '消极' },
    ];

    const examplePrompt = PromptTemplate.fromTemplate('输入: {text}\n\n输出: {label}'); // 定义每个示例的格式，告诉模型输入是什么，输出是什么

    const fewShotPrompt = new FewShotPromptTemplate({
      examples, // 提供示例数据
      examplePrompt, // 定义每个示例的格式
      prefix: '请根据用户输入的文本内容进行情感分类，输出积极、消极或者中立', // 前缀，给模型一些指导信息，告诉它这个任务是什么
      suffix: '输入: {text}\n\n输出:', // 后缀，定义用户输入的格式，告诉模型这是用户输入的文本，接下来是它需要生成的输出
      inputVariables: ['text'], // 定义输入变量，这里是用户输入的文本
    });

    const formatted = await fewShotPrompt.format({ text }); // 格式化提示词，生成最终的提示词文本，准备传给模型
    const res = await this.llm.invoke(formatted);
    return {
      text,
      label: String(res.content).trim(),
    };
  }

  // 利用大模型 codeReview
  async codeReview(code: string, language: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个资深的${language}代码审查助手，帮助用户审查代码，指出其中的错误和改进建议。请直接输出审查结果，不要其他多余的内容。`,
      ],
      ['user', `请审查以下${language}代码，并指出其中的错误和改进建议：\n\n${code}`],
    ]);
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const res = await chain.invoke({
      code,
      language,
    });

    return {
      language,
      code,
      review: res,
    };
  }
}

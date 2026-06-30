import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { config } from '../config';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';

@Injectable()
export class ChainsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
  });

  // 多步执行，每一步的输出都可以作为下一步的输入，适合需求分析，处理复杂任务。
  /* 文章润色例子
    1. 对文章进行分析，提取出文章的主题，风格，存在的问题等关键信息。
    2. 根据第一步的分析结果对文章进行润色，修改，使文章更加流畅。
    核心方法
    1. RunnableSequence 将多个步骤串联起来，每一步的输出都可以作为下一步的输入，适合需求分析，处理复杂任务。
    2. RunnablePassthrough 直接传递数据，不做更改
  */
  async polish(article: string) {
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的文章分析助手，只输出问题列表，不要其他内容'],
      ['human', '分析这篇文章存在的问题： {article}'],
    ]);

    const polishPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个专业的文章润色助手，根据分析结果对文章进行润色，改进文章的表达、结构、用词等方面，使文章更加流畅、清、有吸引力。',
      ],
      ['human', '根据分析结果： {analysis}，对这篇文章进行润色： {article}'],
    ]);

    /* 
      // 分开弄，先分析，再润色, 嵌套写法 分析的结果当成polishChain的输入 
      const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser());
      const polishChain = polishPrompt.pipe(this.llm).pipe(new StringOutputParser());

      return polishChain.invoke({
        analysis: analysisChain.invoke({ article }),
        article,
      }); 
    */

    const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser());
    const fullChain = RunnableSequence.from([
      { article: new RunnablePassthrough(), analysis: analysisChain }, // 文章分析链，输入文章使用RunnablePassthrough来传递，RunnablePassthrough的效果是直接传递输入，然后analysisChain输出分析结果。
      polishPrompt.pipe(this.llm).pipe(new StringOutputParser()), // 润色链 直接接收上一步的输出作为输入，分析结果作为analysis，文章作为article
    ]);

    const res = await fullChain.invoke({ article }); // 输入article
    return {
      original: article,
      polish: res,
    };
  }

  // 顺序连 顺序执行多步 顺序是固定的 关键词 + 风格 -> 大纲 -> 文章 -> seo标题
  async generateBlog(keyWords: string, style: string) {
    // 1. 大纲生成chain
    const outlinePrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的博客大纲生成助手，根据关键词和风格生成博客大纲。'],
      ['human', '根据关键词： {keyWords}，风格： {style}，生成博客大纲'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    // 2. 文章生成chain
    const articlePrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的博客文章生成助手，根据大纲生成博客文章。'],
      ['human', '根据大纲： {outline}，生成博客文章'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    // 3. SEO标题生成chain
    const seoTitlePrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的SEO标题生成助手，根据文章内容生成SEO标题。'],
      ['human', '根据文章内容： {article}，生成SEO标题'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    const outline = await outlinePrompt.invoke({ keyWords, style }); // 生成大纲
    const article = await articlePrompt.invoke({ outline }); // 生成文章
    const seoTitle = await seoTitlePrompt.invoke({ article }); // 生成SEO标题

    return {
      keyWords,
      style,
      outline,
      article,
      seoTitle,
    };
  }

  // 条件链 用户输入一个问题，模型会根据问题的内容和类型来判断应该调用哪个功能模块来处理这个问题。例如翻译、总结、分类等。
  async smartRouter(question: string) {
    // 第一步分类
    const routerPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个智能路由助手，根据用户的问题内容和类型来判断应该调用哪个功能模块来处理这个问题。只输出分类标签：
        技术问题-TECH、
        退款问题-REFUND、
        订单问题-ORDER、
        投诉建议-COMPLAINT、
        其他-OTHER，并给出理由。`,
      ],
      [
        'human',
        '根据用户的问题： {question}，判断应该调用哪个功能模块来处理这个问题，并给出理由。',
      ],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    const category = await routerPrompt.invoke({ question }); // 获取分类标签和理由

    // 这里在真实的项目中通常会有一个更复杂的系统Map，可能会有更多的分类和对应的处理模块，这里为了演示方便，简单的写了几个分类和对应的系统消息。
    const systemMap: Record<string, string> = {
      TECH: '你是一个技术支持助手，专门处理技术问题。',
      REFUND: '你是一个退款处理助手，专门处理退款问题。',
      ORDER: '你是一个订单处理助手，专门处理订单问题。',
      COMPLAINT: '你是一个投诉建议助手，专门处理投诉建议。',
      OTHER: '你是一个客服助手，处理其他问题。',
    };

    const systemMessage = systemMap[category] || systemMap['OTHER']; // 根据标签获取对应的系统消息，如果没有匹配到标签，默认使用OTHER

    const answerPrompt = ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      ['human', '根据用户的问题： {question}，给出处理建议。'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    const answer = await answerPrompt.invoke({ question }); // 获取处理建议

    return {
      question,
      category,
      answer,
    };
  }
}

import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools'; // 把普通的js函数，包装成模型能识别的模式。
import { z } from 'zod';
import { config } from 'src/config';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

@Injectable()
export class AgentsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
  });

  /* tool 有几个参数，
  1. name，工具的名字，
  2. schema，工具的描述，
  3. func，工具的功能函数 */

  // 工具1 定义：查询商品库存和价格，输入商品名称，输出一个字符串，包含商品库存和价格以及品类
  private checkProductTool = tool(
    async ({ productName }: { productName: string }) => {
      const products: Record<string, { price: number; stock: number; category: string }> = {
        'iPhone 18': { price: 999, stock: 10, category: '手机' },
        'MacBook Pro': { price: 1999, stock: 5, category: '电脑' },
        'AirPods Pro': { price: 249, stock: 20, category: '耳机' },
        'Nike Air Max': { price: 150, stock: 15, category: '鞋子' },
        'Samsung Galaxy S21': { price: 799, stock: 8, category: '手机' },
        'Adidas Ultraboost': { price: 180, stock: 12, category: '鞋子' },
      };

      const product = products[productName];
      if (!product) {
        return `抱歉，未找到${productName}的相关信息。`;
      }
      if (product.stock === 0) {
        return `${productName}目前缺货，价格是${product.price}美元，品类是${product.category}。`;
      }
      return `${productName}的价格是${product.price}美元，库存为${product.stock}件，品类是${product.category}。`;
    },
    {
      name: 'check_products',
      description: '查询商品库存和价格，输入商品名称，输出一个字符串，包含商品库存和价格以及品类',
      schema: z.object({
        productName: z.string().describe('要查询的商品名称'), // 参数productName是一个字符串，描述为“要查询的商品名称
      }),
    },
  );

  // 工具2 定义：创建订单
  private createOrderTool = tool(
    async ({
      productName,
      quantity,
      customerName,
    }: {
      productName: string;
      quantity: number;
      customerName: string;
    }) => {
      const prices: Record<string, number> = {
        'iPhone 18': 999,
        'MacBook Pro': 1999,
        'AirPods Pro': 249,
        'Nike Air Max': 150,
        'Samsung Galaxy S21': 799,
        'Adidas Ultraboost': 180,
      };
      const unitPrice = prices[productName] ?? 0;
      if (!unitPrice) {
        return `无法创建订单，未找到${productName}的价格信息。`;
      }
      const totalPrice = unitPrice * quantity;
      // 这里直接返回一个对象，模拟订单创建成功的结果
      // 订单 id、productName、quantity、customerName、totalPrice、currentAt
      const orderId = `ORD-${Date.now()}`;
      const currentAt = new Date().toISOString();
      return {
        orderId,
        productName,
        quantity,
        customerName,
        totalPrice,
        currentAt,
      };
    },
    {
      name: 'create_order',
      description: '创建订单，输入商品名称和数量，输出订单创建结果,客户姓名',
      schema: z.object({
        productName: z.string().describe('要购买的商品名称'),
        quantity: z.number().describe('购买的数量'),
        customerName: z.string().describe('客户姓名'),
      }),
    },
  );

  // 工具3 查询订单
  private checkOrderStatusTool = tool(
    async ({ orderId }: { orderId: string }) => {
      // 模拟订单状态查询，这里直接返回一个随机的订单状态
      const statuses = ['处理中', '已发货', '已完成', '已取消'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const extra = status === '已取消' ? '订单已取消，可能是由于库存不足或客户请求取消。' : '';
      return `订单${orderId}的当前状态是：${status}。${extra}`;
    },
    {
      name: 'check_order_status',
      description: '查询订单状态，输入订单ID，输出订单当前状态',
      schema: z.object({
        orderId: z.string().describe('要查询的订单ID, 例如ORD-1700000000000'),
      }),
    },
  );

  // 工具4 申请退款
  private refundTool = tool(
    async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const refundId = `REFUND-${Date.now().toString().slice(-6)}`;
      return `订单${orderId}的退款申请已提交，退款ID为${refundId}。退款理由：${reason}`;
    },
    {
      name: 'refund_order',
      description: '申请订单退款，输入订单ID和退款理由，输出退款申请结果',
      schema: z.object({
        orderId: z.string().describe('要申请退款的订单ID, 例如ORD-1700000000000'),
        reason: z.string().describe('申请退款的理由'),
      }),
    },
  );

  // Agent的执行逻辑
  async runAgent(message: string) {
    const tools = [
      this.checkProductTool,
      this.createOrderTool,
      this.checkOrderStatusTool,
      this.refundTool,
    ];
    const toolMap: Record<string, any> = {
      check_products: this.checkProductTool,
      create_order: this.createOrderTool,
      check_order_status: this.checkOrderStatusTool,
      refund_order: this.refundTool,
    };

    // bindTools 把方法绑定到大模型里面。大模型调用工具后，会把工具的输出结果整合到模型的返回结果里，返回给用户。
    // 注册成功后，模型的恢复里面会包含 tool_calls 字段，里面包含了模型调用工具的相关信息，包括调用了哪个工具，传递了什么参数，以及工具的输出结果是什么。
    const llmWithTools = this.llm.bindTools(tools);
    // 定义 消息历史： Agent 每一轮都能看到完整的对话和工具的调用结果。
    const messages: any[] = [
      // 设定系统格式，告诉模型它是一个电商客服助手，能够使用工具查询商品信息、创建订单、查询订单状态和申请退款。
      new SystemMessage(
        `你是一个[极速购]电商平台的AI智能客服助手,帮助用户查询商品信息、创建订单、查询订单状态和申请退款。
        你可以使用以下的工具帮助客户：
        - check_products: 查询商品库存和价格，输入商品名称，输出一个字符串，包含商品库存和价格以及品类
        - create_order: 创建订单，输入商品名称和数量，输出订单创建结果,客户姓名
        - check_order_status: 查询订单状态，输入订单ID，输出订单当前状态
        - refund_order: 申请订单退款，输入订单ID和退款理由，输出退款申请结果
        工作原则：
        1. 先用工具获取真实信息，再给客户回复。
        2. 下单前必须先查询库存，确认有货后才能下单。
        3. 下单的时候要知道用户的姓名，如果用户没有提供姓名，要先询问用户的姓名。
        4. 回答要简洁、友好、使用中文。
        `,
      ),
      new HumanMessage(message),
    ];

    // 记录一下每一步执行的过程(用于调试，和前端展示)
    const steps: string[] = [];
    let roundCount = 0;

    // 定义一个递归函数来处理回答和工具调用。
    while (roundCount < 6) {
      roundCount++;
      console.log(`第${roundCount}轮对话：`);

      const response = await llmWithTools.invoke(messages);
      // 把模型的回答加入消息历史，这样模型在下一轮就能看到之前的回答和工具调用结果，知道自己上一步做了什么，发生了什么问题。
      messages.push(response);
      const { content, tool_calls } = response;
      // 没有tool_calls，说明模型没有调用工具，直接给出了回答，这时候就可以结束了。
      if (!tool_calls || tool_calls.length === 0) {
        steps.push(`模型回答：${content}`);
        break;
      }

      // 每一步执行
      for (const call of tool_calls) {
        steps.push(`模型调用工具：${call.name}，参数：${JSON.stringify(call.args)}`);
        console.log(`tools调用：${call.name}，参数：${JSON.stringify(call.args)}`);

        const toolFunc = toolMap[call.name]; // 根据工具名称找到对应的工具函数
        if (!toolFunc) {
          const errorMsg = `未找到工具：${call.name}`;
          steps.push(errorMsg);
          /* 把错误信息也加入消息历史，让模型知道发生了什么问题 */
          messages.push(new ToolMessage({ content: errorMsg, tool_call_id: call.id ?? '' }));
          continue;
        }

        // 调用工具函数 获取结果
        const toolResult = await toolFunc.invoke(call.args);
        console.log(toolResult);
        steps.push(`工具${call.name}的输出结果：${toolResult}`);
        console.log(`工具${call.name}的输出结果：${toolResult}`);

        /* 把工具的输出结果加入消息历史，让模型知道工具调用的结果是什么 */
        messages.push(
          new ToolMessage({ content: String(toolResult), tool_call_id: call.id ?? '' }),
        );
      }
    }

    const finalResponse =
      [...messages].reverse().find((msg) => msg instanceof AIMessage) ||
      '很抱歉，未能处理您的请求。';
    return {
      message,
      steps,
      totalRounds: roundCount,
      answer: finalResponse instanceof AIMessage ? finalResponse.content : finalResponse,
    };
  }
}

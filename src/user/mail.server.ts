
import { Injectable } from '@nestjs/common';
@Injectable()
export class MailService {
    sendMail(options: { to: string; subject: string; text: string }) {
        // 这里模拟发送邮件，实际项目中会调用第三方邮件服务的 API
        console.log(`发送邮件给 ${options.to}，主题：${options.subject}，内容：${options.text}`);
    }
}   
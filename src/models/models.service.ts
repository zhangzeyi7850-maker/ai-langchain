import { Injectable } from '@nestjs/common';

@Injectable()
export class ModelsService {
  baseChat() {
    return {
      message: 'Hello, this is a response from the base chat model.',
    };
  }
}

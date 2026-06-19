import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  async loadDocuments(documents: { id: string; content: string; source?: string }[]) {}
}

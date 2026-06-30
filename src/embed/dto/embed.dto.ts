export class EmbedSingleDto {
  text: string
}

export class EmbedBatchDto {
  texts: string[]
}

export class SimilarityDto {
  query: string
  documents: string[]
}

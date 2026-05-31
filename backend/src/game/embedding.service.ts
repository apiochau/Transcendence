import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildSemanticExpansionEmbeddings } from './semantic-expansion.data';
import { WordNormalizerService } from './word-normalizer.service';

type EmbeddingIndex = Record<string, number[]>;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddings: EmbeddingIndex;

  constructor(private readonly wordNormalizerService: WordNormalizerService) {
    this.embeddings = this.loadEmbeddings();
  }

  getAllEmbeddings(): Record<string, number[]> {
    return this.embeddings;
  }

  private loadEmbeddings(): EmbeddingIndex {
    const embeddingsPath = join(process.cwd(), 'data', 'embeddings', 'words.json');

    try {
      const rawEmbeddings = JSON.parse(readFileSync(embeddingsPath, 'utf8')) as EmbeddingIndex;
      const semanticExpansionEmbeddings = buildSemanticExpansionEmbeddings((word) =>
        this.wordNormalizerService.normalize(word),
      );
      const embeddings = {
        ...semanticExpansionEmbeddings,
        ...rawEmbeddings,
      };

      this.validateEmbeddings(embeddings);
      this.logger.log(
        `Loaded ${Object.keys(rawEmbeddings).length} local word embeddings and ${Object.keys(semanticExpansionEmbeddings).length} semantic expansion embeddings`,
      );
      return embeddings;
    } catch (error) {
      this.logger.error(`Unable to load local embeddings from ${embeddingsPath}`, error);
      return {};
    }
  }

  private validateEmbeddings(embeddings: EmbeddingIndex) {
    for (const [word, vector] of Object.entries(embeddings)) {
      if (!Array.isArray(vector) || vector.length === 0 || !vector.every((value) => typeof value === 'number')) {
        throw new Error(`Invalid embedding vector for "${word}"`);
      }
    }
  }
}

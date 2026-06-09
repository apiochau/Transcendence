import { Module } from '@nestjs/common';
import { CategoryFallbackService } from './category-fallback.service';
import { EmbeddingService } from './embedding.service';
import { GameController, SoloGameController } from './game.controller';
import { GameService } from './game.service';
import { SimilarityService } from './similarity.service';
import { SuggestionService } from './suggestion.service';
import { WordNormalizerService } from './word-normalizer.service';
import { WordService } from './word.service';

@Module({
  controllers: [GameController, SoloGameController],
  providers: [
    GameService,
    WordService,
    WordNormalizerService,
    SimilarityService,
    SuggestionService,
    EmbeddingService,
    CategoryFallbackService,
  ],
  exports: [GameService, WordService, SimilarityService],
})
export class GameModule {}

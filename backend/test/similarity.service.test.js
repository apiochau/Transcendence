const assert = require('node:assert/strict');
const test = require('node:test');
const { CategoryFallbackService } = require('../dist/game/category-fallback.service');
const { EmbeddingService } = require('../dist/game/embedding.service');
const { SimilarityService } = require('../dist/game/similarity.service');
const { WordNormalizerService } = require('../dist/game/word-normalizer.service');
const { WordService } = require('../dist/game/word.service');

function createService() {
  const normalizer = new WordNormalizerService();
  const embeddingService = new EmbeddingService(normalizer);
  const categoryFallbackService = new CategoryFallbackService(normalizer);
  const prisma = {
    word: {
      upsert: async () => ({}),
    },
  };
  const wordService = new WordService(prisma, normalizer, embeddingService, categoryFallbackService);

  return {
    similarityService: new SimilarityService(wordService),
    wordService,
  };
}

test('exact known word returns 100', () => {
  const { similarityService } = createService();
  const score = similarityService.calculateKnownSimilarity('telephone', 'telephone');

  assert.equal(score, 100);
});

test('known local words are scored with cosine similarity', () => {
  const { similarityService } = createService();
  const score = similarityService.calculateKnownSimilarity('ecole', 'professeur');

  assert.ok(score >= 75);
});

test('train lexical field recognizes rail and wagon as close', () => {
  const { similarityService } = createService();
  const rail = similarityService.calculateKnownSimilarity('train', 'rail');
  const wagon = similarityService.calculateKnownSimilarity('train', 'wagon');
  const avion = similarityService.calculateKnownSimilarity('train', 'avion');

  assert.ok(rail >= avion);
  assert.ok(wagon >= avion);
});

test('lion lexical field recognizes savane as close', () => {
  const { similarityService } = createService();
  const savane = similarityService.calculateKnownSimilarity('lion', 'savane');
  const montagne = similarityService.calculateKnownSimilarity('lion', 'montagne');

  assert.ok(savane >= 70);
  assert.ok(savane < 98);
  assert.ok(savane > montagne);
});

test('bucket boundaries match gameplay requirements', () => {
  const { similarityService } = createService();

  assert.equal(similarityService.getBucket(90), 'hot');
  assert.equal(similarityService.getBucket(70), 'hot');
  assert.equal(similarityService.getBucket(69), 'warm');
  assert.equal(similarityService.getBucket(40), 'warm');
  assert.equal(similarityService.getBucket(39), 'cold');
  assert.equal(similarityService.getBucket(15), 'cold');
  assert.equal(similarityService.getBucket(14), 'frozen');
});

test('all controlled suggestions come from known local words', () => {
  const { similarityService, wordService } = createService();
  const rankedWords = similarityService.rankKnownWordsBySimilarity('telephone', new Set(['telephone']));

  assert.ok(rankedWords.length > 0);
  assert.ok(rankedWords.every((word) => Boolean(wordService.getWord(word.id))));
});

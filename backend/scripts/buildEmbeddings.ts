import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline';

interface CliOptions {
  fasttext?: string;
  wordlist?: string;
  output: string;
  limit: number;
}

function normalize(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/(aux)$/, 'al')
    .replace(/([a-z]{4,})[sx]$/, '$1');
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    output: 'data/embeddings/words.json',
    limit: 10000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--fasttext') {
      options.fasttext = next;
      index += 1;
    } else if (arg === '--wordlist') {
      options.wordlist = next;
      index += 1;
    } else if (arg === '--output') {
      options.output = next;
      index += 1;
    } else if (arg === '--limit') {
      options.limit = Number(next);
      index += 1;
    }
  }

  if (!options.fasttext || !options.wordlist) {
    throw new Error(
      'Usage: npm run build:embeddings -- --fasttext /path/cc.fr.300.vec --wordlist /path/words.txt --output data/embeddings/words.json --limit 10000',
    );
  }

  return options;
}

function loadTargetWords(path: string, limit: number): Set<string> {
  const words = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(normalize)
    .filter((word) => word.length > 1)
    .slice(0, limit);

  return new Set(words);
}

async function buildEmbeddings() {
  const options = parseArgs();
  const fasttextPath = options.fasttext;
  const wordlistPath = options.wordlist;

  if (!fasttextPath || !wordlistPath) {
    throw new Error('Missing required --fasttext or --wordlist argument');
  }

  const targetWords = loadTargetWords(resolve(wordlistPath), options.limit);
  const embeddings: Record<string, number[]> = {};
  const reader = createInterface({
    input: createReadStream(resolve(fasttextPath)),
    crlfDelay: Infinity,
  });

  for await (const line of reader) {
    if (Object.keys(embeddings).length >= targetWords.size) {
      break;
    }

    const [rawWord, ...rawVector] = line.trim().split(/\s+/);
    const word = normalize(rawWord);

    if (!targetWords.has(word) || embeddings[word]) {
      continue;
    }

    const vector = rawVector.map(Number);
    if (vector.length > 0 && vector.every(Number.isFinite)) {
      embeddings[word] = vector;
    }
  }

  const outputPath = resolve(options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(embeddings)}\n`);

  console.log(`Wrote ${Object.keys(embeddings).length} embeddings to ${outputPath}`);
}

void buildEmbeddings();

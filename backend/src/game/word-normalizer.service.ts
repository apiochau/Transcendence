import { Injectable } from '@nestjs/common';

const LEADING_PARTICLES = new Set(['l', 'd', 'j', 'm', 't', 's', 'n', 'qu']);
const SINGULAR_EXCEPTIONS = new Set(['cours', 'pays', 'souris', 'fois']);

@Injectable()
export class WordNormalizerService {
  normalize(word: string): string {
    const normalized = word
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const withoutParticle = this.removeLeadingParticle(normalized);
    return this.singularize(withoutParticle.replace(/\s+/g, ''));
  }

  private removeLeadingParticle(word: string): string {
    const parts = word.split(' ').filter(Boolean);

    if (parts.length > 1 && LEADING_PARTICLES.has(parts[0])) {
      return parts.slice(1).join(' ');
    }

    return word;
  }

  private singularize(word: string): string {
    if (SINGULAR_EXCEPTIONS.has(word)) {
      return word;
    }

    if (word.length <= 3) {
      return word;
    }

    if (word.endsWith('aux')) {
      return `${word.slice(0, -3)}al`;
    }

    if (word.endsWith('eaux')) {
      return word.slice(0, -1);
    }

    if (word.endsWith('s') || word.endsWith('x')) {
      return word.slice(0, -1);
    }

    return word;
  }
}

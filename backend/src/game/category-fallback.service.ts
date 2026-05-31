import { Injectable } from '@nestjs/common';
import { buildSemanticExpansionCategories } from './semantic-expansion.data';
import { WordNormalizerService } from './word-normalizer.service';

const BASE_WORD_CATEGORIES: Record<string, string[]> = {
  electricite: ['energie', 'technologie', 'maison', 'objet'],
  energie: ['energie', 'technologie'],
  batterie: ['energie', 'technologie', 'objet'],
  chargeur: ['energie', 'technologie', 'objet'],
  cable: ['technologie', 'objet'],
  domotique: ['technologie', 'maison', 'objet'],
  telephone: ['technologie', 'communication', 'objet'],
  smartphone: ['technologie', 'communication', 'objet'],
  ordinateur: ['technologie', 'informatique', 'objet'],
  internet: ['technologie', 'communication', 'informatique'],
  logiciel: ['technologie', 'informatique', 'objet'],
  clavier: ['technologie', 'informatique', 'objet'],
  ecran: ['technologie', 'informatique', 'objet'],
  train: ['transport', 'vehicule', 'rail'],
  rail: ['transport', 'rail', 'objet'],
  wagon: ['transport', 'rail', 'vehicule', 'objet'],
  gare: ['transport', 'rail', 'batiment', 'lieu'],
  voiture: ['transport', 'vehicule', 'route'],
  avion: ['transport', 'vehicule', 'air'],
  ecole: ['education', 'batiment', 'institution'],
  eleve: ['education', 'personne', 'apprentissage'],
  professeur: ['education', 'personne', 'enseignement'],
  universite: ['education', 'institution', 'batiment'],
  cours: ['education', 'apprentissage', 'enseignement'],
  maison: ['maison', 'batiment', 'lieu'],
  chien: ['animal', 'maison'],
  chat: ['animal', 'maison'],
  crocodile: ['animal', 'nature'],
  montagne: ['nature', 'lieu'],
  plage: ['nature', 'lieu', 'eau'],
  football: ['sport'],
  tennis: ['sport'],
  medecin: ['metier', 'sante'],
  boulanger: ['metier', 'nourriture'],
  france: ['pays', 'lieu'],
};

@Injectable()
export class CategoryFallbackService {
  private readonly wordCategories: Record<string, string[]>;

  constructor(private readonly wordNormalizerService: WordNormalizerService) {
    this.wordCategories = {
      ...buildSemanticExpansionCategories((word) => this.wordNormalizerService.normalize(word)),
      ...BASE_WORD_CATEGORIES,
    };
  }

  getPrimaryCategory(word: string): string | undefined {
    return this.wordCategories[word]?.[0];
  }
}

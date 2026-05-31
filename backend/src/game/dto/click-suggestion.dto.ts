import { IsString, MinLength } from 'class-validator';

export class ClickSuggestionDto {
  @IsString()
  @MinLength(1)
  wordId: string;
}

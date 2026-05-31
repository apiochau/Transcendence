import { IsString, MinLength } from 'class-validator';

export class FinalAnswerDto {
  @IsString()
  @MinLength(1)
  answer: string;
}

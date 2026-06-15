import { IsUUID, IsString, MinLength, MaxLength,} from 'class-validator';

export class CreateFeedbackDto 
{
  @IsUUID()
  sessionId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  content: string;
}

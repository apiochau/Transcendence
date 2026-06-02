import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CollectionService } from './collection.service';

@UseGuards(JwtAuthGuard)
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionService.getCollection(user.userId);
  }
}

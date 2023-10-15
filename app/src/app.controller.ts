import { Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('interop')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('list')
  async get() {
    return this.appService.get();
  }

  @Post('create')
  async create(): Promise<any> {
    return await this.appService.create();
  }
  
  @Get('transforming')
  async transformer(
    @Query('resourceType') resourceType: string,
  ) {
    return this.appService.transformer(resourceType);
  }
}

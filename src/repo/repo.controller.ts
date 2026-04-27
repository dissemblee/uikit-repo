import { Controller, Get, Post } from '@nestjs/common';
import { RepoService } from './repo.service';

@Controller('/api/repo')
export class RepoController {
  constructor(private readonly repoService: RepoService) {}

  @Get('/:username/:name')
  getRepo() {
    return this.repoService.getRepo();
  }

  @Get('/package/:useraname/:name')
  getPackage() {
    return this.repoService.getPackage();
  }

  @Post()
  createRepo() {
    return this.repoService.createNewRepo();
  }
}

import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { RepoService } from './repo.service';
import { RepoCreateDto } from '@48-iq/uikit-dto-lib';
import { RepoMapper } from './repo.mapper';

@Controller('/api/repo')
export class RepoController {
  constructor(
    private readonly repoService: RepoService,
    private readonly repoMapper: RepoMapper
  ) {}

  @Get('/:username/:name')
  getRepo(
    @Param('username') username: string,
    @Param('name') name: string,
  ) {
    const repoId = `${username}/${name}`;
    return this.repoService.getRepo(repoId);
  }

  @Get('/package/:useraname/:name')
  getPackage(
    @Param('username') username: string,
    @Param('name') name: string,
    @Param('version') version: string
  ) {
    const packageId = `${username}/${name}`;
    return this.repoService.getPackage(packageId);
  }

  @Post()
  async createRepo(
    @Body() repo: RepoCreateDto,
    @Req() req
  ) {
    const username = req['authPayload']['username'];
    
    const result = await this.repoService.createNewRepo({
      username,
      repo,
    });

    const response = this.repoMapper.entityToDto(result);
    return response;
  }
}

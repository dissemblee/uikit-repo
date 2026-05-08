import { Body, Controller, Get, Param, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { RepoService } from './repo.service';
import { RepoCreateDto } from '@48-iq/uikit-dto-lib';
import { RepoMapper } from './repo.mapper';
import { Public } from 'src/security/public.decorator';
import { BuildTrackerService } from 'src/build/services/build-tracker.service';

@Controller('/api/repo')
export class RepoController {
  constructor(
    private readonly repoService: RepoService,
    private readonly repoMapper: RepoMapper,
    private readonly buildTracker: BuildTrackerService,
  ) {}

  @Public()
  @Get() 
  async getAll(){
    const result = await this.repoService.getAll();
    return this.repoMapper.entityToDtos(result);
  }

  @Get('/builds/:buildId/logs')
  async getBuildLogs(@Param('buildId') buildId: string) {
    const build = await this.buildTracker.getBuild(buildId);
    return { 
      buildId: build.id,
      status: build.status,
      logs: build.logs || '',
      startedAt: build.startedAt,
      finishedAt: build.finishedAt,
      errorMessage: build.errorMessage,
    };
  }

  @Get('/builds/:buildId')
  async getBuild(@Param('buildId') buildId: string) {
    return this.buildTracker.getBuild(buildId);
  }

  @Get('/:username/builds')
  async getUserBuilds(@Param('username') username: string) {
    console.log('>>> getUserBuilds hit, username:', username);
    return this.buildTracker.getBuildsByUsername(username);
  }

  @Get('/:username/:name/builds')
  async getRepoBuilds(
    @Param('username') username: string,
    @Param('name') name: string,
  ) {
    const repoId = `${username}/${name}`;
    return this.buildTracker.getBuildsByRepo(repoId);
  }

  @Public()
  @Get('/package/:username/:name')
  async getPackage(
    @Param('username') username: string,
    @Param('name') name: string,
    
  ) {
    const packageId = `${username}/${name}`;
    const file = await this.repoService.getPackage(packageId);
    return new StreamableFile(file);
  }

  @Public()
  @Get('/:username/:name')
  async getRepo(
    @Param('username') username: string,
    @Param('name') name: string,
  ) {
    const repoId = `${username}/${name}`;
    const repo = await this.repoService.getRepo(repoId);
    return this.repoMapper.entityToDto(repo);
  }

  // @Get()
  // async getMany(
  //   @Query('startDate') startDate?: string,
  //   @Query('skip') skip?: number,
  //   @Query('limit') limit?: number,
  // ) {
  //   const date = startDate === undefined ? new Date() : new Date(startDate);
  //   const result = await this.repoService.getMany({
  //     startDate: date,
  //     skip,
  //     limit,
  //     username: undefined,
  //   });
  //   return this.repoMapper.toCursorResultDto(result);
  // }

  @Get('/:username')
  async getRepoByUser(
    @Param('username') username: string
  ) {
    const repos = await this.repoService.getRepoByUser(username);
    const response = this.repoMapper.entityToDtos(repos);
    return response;
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

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Build, BuildStatus } from "src/postgres/entities/build.entity";
import { Repository } from "typeorm";

@Injectable()
export class BuildTrackerService {
  constructor(
    @InjectRepository(Build)
    private buildRepo: Repository<Build>,
  ) {}

  async createBuild(data: { username: string; name: string; version: string; repoId: string }) {
    const build = this.buildRepo.create({
      ...data,
      status: BuildStatus.RUNNING,
      logs: '',
    });
    return this.buildRepo.save(build);
  }

  async appendLog(buildId: string, message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] `;
    const logLine = `${prefix}${message}\n`;

    await this.buildRepo
      .createQueryBuilder()
      .update(Build)
      .set({ 
        logs: () => `COALESCE(logs, '') || '${logLine.replace(/'/g, "''")}'` 
      })
      .where('id = :id', { id: buildId })
      .execute();
  }

  async finishBuild(buildId: string, status: BuildStatus, error?: string) {
    await this.buildRepo.update(buildId, {
      status,
      finishedAt: new Date(),
      errorMessage: error,
    });
  }

  async getBuildsByRepo(repoId: string) {
    return this.buildRepo.find({ where: { repoId }, order: { startedAt: 'DESC' } });
  }

  async getBuildsByUsername(username: string) {
    return this.buildRepo.find({
      where: { username },
      order: { startedAt: 'DESC' },
      take: 50,
      relations: ['repo'],
    });
  }

  async getBuild(buildId: string) {
    const build = await this.buildRepo.findOne({
      where: { id: buildId },
      relations: ['repo'],
    });

    if (!build) {
      throw new Error(`Build with id ${buildId} not found`);
    }
    return build;
  }

}

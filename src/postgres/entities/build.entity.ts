import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Repo } from './repo.entity';

export enum BuildStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('builds')
export class Build {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repoId: string;

  @ManyToOne(() => Repo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'repoId' })
  repo?: Repo;

  @Column()
  username: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column({ type: 'enum', enum: BuildStatus, default: BuildStatus.PENDING })
  status: BuildStatus;

  @Column({ type: 'text', nullable: true })
  logs: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  @Column({ default: 'repo' })
  type: string;
}
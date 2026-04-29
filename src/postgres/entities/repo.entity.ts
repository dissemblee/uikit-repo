import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Component } from './component.entity';

@Entity({ name: 'repos' })
export class Repo {
  @PrimaryColumn()
  id: string;

  @Column()
  username: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column()
  description: string;

  @ManyToMany(() => Component, (component) => component.repos)
  @JoinTable({
    name: 'repos_components',
    joinColumn: { name: 'repoId' },
    inverseJoinColumn: { name: 'componentId' },
  })
  components: Component[];

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true})
  updatedAt?: Date;
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn } from 'typeorm';
import { Repo } from './repo.entity';

@Entity({ name: 'components' })
export class Component {
  @PrimaryColumn()
  id: string;

  @Column()
  version: string;

  @ManyToMany(() => Repo, (repo) => repo.components)
  repos: Repo[];
}

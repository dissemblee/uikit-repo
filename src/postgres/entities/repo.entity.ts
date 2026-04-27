import { Entity } from "typeorm";

@Entity({ name: 'repos' })
export class Repo {
  id: string;
  name: string;
  description: string;
  
}
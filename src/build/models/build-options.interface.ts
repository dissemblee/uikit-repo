import { ComponentType } from "./types";

export interface BuildOptions {
  version: string;
  components: ComponentType[];
  name: string;
  username: string;
  buildId?: string;
}



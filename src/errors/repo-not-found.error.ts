export class RepoNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
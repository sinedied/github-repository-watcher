import { Injectable } from '@angular/core';
import { config } from './config';

interface RepoInfo {
  name: string;
  openIssues: number;
  openPRs: number;
  securityIssues: number;
  technologies: string[];
  lastCommitDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReposService {

  async getRepoInfos(): Promise<RepoInfo[]> {
    const response = await fetch(config.repoDataUrl);
    const repos: RepoInfo[] = await response.json();
    return repos;
  }
}

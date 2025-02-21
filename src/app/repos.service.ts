import { Injectable } from '@angular/core';
import { config } from './config';

export interface RepoInfo {
  name: string;
  defaultBranch: string;
  description: string;
  topics: string[];
  languages: string[];
  stars: number;
  forks: number;
  openIssues: number;
  openPullRequests: number;
  securityAlerts: {
    advisories: number;
    dependabot: number | 'disabled';
    codeScanning: number | 'disabled';
    secretScanning: number | 'disabled';
  };
  lastCommitDate: string;
  packageVersions: Record<string, VersionInfo>;
}

export interface VersionInfo {
  short: string;
  current: string;
  latest: string;
  foundInPath: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReposService {

  async getRepoInfos(): Promise<RepoInfo[]> {
    // Avoid cache
    const randomString = Math.random().toString(36).substring(2, 15);
    const response = await fetch(`${config.repoDataUrl}?${randomString}`);
    const repos: RepoInfo[] = await response.json();
    return repos.map(repo => ({
      ...repo,
      securityAlerts: {
        advisories: repo.securityAlerts.advisories,
        dependabot: repo.securityAlerts.dependabot ?? 'disabled',
        codeScanning: repo.securityAlerts.codeScanning ?? 'disabled',
        secretScanning: repo.securityAlerts.secretScanning ?? 'disabled',
      }
    }));
  }
}

import { Injectable } from '@angular/core';
import { Octokit } from 'octokit';
import { environment } from '../environments/environment';

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
export class GitHubService {
  private octokit = new Octokit({ auth: environment.githubToken });

  async getRepoInfo(repoUrl: string): Promise<RepoInfo> {
    const [owner, repo] = this.parseRepoUrl(repoUrl);
    
    const [repoData, pulls, security, languages] = await Promise.all([
      this.octokit.rest.repos.get({ owner, repo }),
      this.octokit.rest.pulls.list({ owner, repo, state: 'open' }),
      this.octokit.rest.securityAdvisories.listRepositoryAdvisories({ owner, repo }),
      this.octokit.rest.repos.listLanguages({ owner, repo })
    ]);

    return {
      name: repoData.data.full_name,
      openIssues: repoData.data.open_issues_count - pulls.data.length,
      openPRs: pulls.data.length,
      securityIssues: security.data.length,
      technologies: Object.keys(languages.data),
      lastCommitDate: repoData.data.pushed_at
    };
  }

  private parseRepoUrl(url: string): [string, string] {
    const parts = url.replace('https://github.com/', '').split('/');
    return [parts[0], parts[1]];
  }
}

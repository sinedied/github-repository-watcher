import { Octokit } from 'octokit';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPOS_LIST = join(process.cwd(), 'data', 'repos.txt');
const OUTPUT_FILE = join(process.cwd(), 'data', 'repos.json');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getRepoInfo(repoUrl) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  
  const [repoData, pulls, security, languages] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.pulls.list({ owner, repo, state: 'open' }),
    octokit.rest.securityAdvisories.listRepositoryAdvisories({ owner, repo }),
    octokit.rest.repos.listLanguages({ owner, repo })
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

async function main() {
  const reposFile = readFileSync(REPOS_LIST, 'utf8');
  const repos = reposFile.split('\n').filter(line => line?.trim());
  
  const reposData = await Promise.all(
    repos.map(async (repo) => {
      try {
        return await getRepoInfo(repo.trim());
      } catch (error) {
        console.error(`Error fetching data for ${repo}:`, error);
        return null;
      }
    })
  );

  const validData = reposData.filter(data => data !== null);
  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(validData, null, 2)
  );
}

main().catch(console.error);

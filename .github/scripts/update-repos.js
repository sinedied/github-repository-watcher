#!/usr/bin/env node
/*
 * This script fetches data about the repositories listed in `data/repos.txt`
 * and saves it to `data/repos.json`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPOS_LIST = path.join(__dirname, '..', '..', 'data', 'repos.txt');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'data', 'repos.json');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getRepoInfo(repoUrl) {
  console.log(`Fetching data for ${repoUrl}...`);
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  const [repoData, pulls, securityAdvisories, dependabotAlerts, codeScanningAlerts, secretScanningAlerts, languages] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.pulls.list({ owner, repo, state: 'open' }),
    octokit.rest.securityAdvisories.listRepositoryAdvisories({ owner, repo }),
    octokit.rest.dependabot.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.codeScanning.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.secretScanning.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.repos.listLanguages({ owner, repo })
  ]);

  return {
    name: repoData.data.full_name,
    description: repoData.data.description,
    topics: repoData.data.topics,
    languages: Object.keys(languages.data),
    stars: repoData.data.stargazers_count,
    forks: repoData.data.forks_count,
    openIssues: repoData.data.open_issues_count - pulls.data.length,
    openPullRequests: pulls.data.length,
    securityAlerts: {
      advisories: securityAdvisories?.data.length,
      dependabot: dependabotAlerts?.data.length,
      codeScanning: codeScanningAlerts?.data.length,
      secretScanning: secretScanningAlerts?.data.length
    },
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
        process.exit(1);
      }
    })
  );

  console.log(`Writing data to ${OUTPUT_FILE} for ${reposData.length} repositories...`);
  writeFileSync(OUTPUT_FILE, JSON.stringify(reposData, null, 2));
}

await main().catch(console.error);

#!/usr/bin/env node
/*
 * This script fetches data about the repositories listed in `data/repos.md`
 * and saves it to `data/repos.json`.
 * Usage: `tsx .github/scripts/update-repos.ts [<partial-repo-name>]`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';
import semver from 'semver';

dotenv.config({ override: true });

export interface RepoInfo {
  name: string;
  description: string;
  topics: string[];
  languages: string[];
  stars: number;
  forks: number;
  openIssues: number;
  openPullRequests: number;
  securityAlerts: {
    advisories: number;
    dependabot?: number;
    codeScanning?: number;
    secretScanning?: number;
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPOS_LIST = path.join(__dirname, '..', '..', 'data', 'repos.md');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'data', 'repos.json');
const PACKAGES_FILE = path.join(__dirname, '..', '..', 'data', 'packages.json');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const parseRepoUrl = (repoUrl: string) => repoUrl.replace('https://github.com/', '').split('/');

async function getLatestVersion(packageName: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
  const data = await response.json();
  return data.version;
}

async function getPackageVersions(repoUrl: string) {
  const [owner, repo] = parseRepoUrl(repoUrl);
  const watchedPackages = JSON.parse(readFileSync(PACKAGES_FILE, 'utf8'));
  const q = `filename:package.json repo:${owner}/${repo}`;
  const packageFiles = await octokit.rest.search.code({ q });

  const versions: Record<string, Partial<VersionInfo>>[] = await Promise.all(
    packageFiles.data.items.map(async (file) => {
      const content = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.path,
      });

      
      // Skip if content is not a file or doesn't have content
      if (!('content' in content.data)) {
        return {};
      }
      
      try {
        const decoded = Buffer.from(content.data.content, 'base64').toString();
        const packageJson = JSON.parse(decoded);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        return Object.entries(deps)
          .filter(([name]) => watchedPackages.includes(name))
          .reduce((acc, [name, version]) => {
            const coercedVersion = semver.coerce(version);
            if (!acc[name] || semver.lt(coercedVersion, acc[name]?.current)) {
              acc[name] = {
                current: coercedVersion?.version || undefined,
                foundInPath: file.path,
              };
            }
            return acc;
          }, {});
      } catch (error) {
        console.warn(`Error parsing package.json in ${file.path}:`, error);
        return {};
      }
    })
  );

  // Merge all found versions, taking the lowest occurrence of each package
  const mergedVersions = versions.reduce((acc, curr) => {
    Object.entries(curr).forEach(([name, version]) => {
      const coercedVersion = semver.coerce(version.current);
      if (!acc[name] || semver.lt(coercedVersion, acc[name]?.current ?? '0.0.0')) {
        acc[name] = version;
      }
    });
    return acc;
  }, {});

  // Prettify the versions
  const prettifiedVersions: Record<string, Partial<VersionInfo>> = Object.entries(mergedVersions).reduce((acc, [name, version]) => {
    const coercedVersion = semver.coerce(version.current);
    acc[name] = { ...version };
    if (coercedVersion) {
      if (coercedVersion.major > 0) {
        acc[name].short = `${coercedVersion.major}`;
      } else if (coercedVersion.minor > 0) {
        acc[name].short = `${coercedVersion.major}.${coercedVersion.minor}`;
      } else {
        acc[name].short = `${coercedVersion.major}.${coercedVersion.minor}.${coercedVersion.patch}`;
      }
    } else {
      acc[name].short = '*';
    }
    return acc;
  }, {});

  // Fetch the latest version for each package
  const packages = Object.keys(prettifiedVersions);
  const uniquePackages = [...new Set(packages)];
  const latestVersions = await Promise.all(uniquePackages.map(getLatestVersion));
  const latestVersionsMap = uniquePackages.reduce((acc, name, index) => {
    acc[name] = latestVersions[index];
    return acc;
  }, {});

  const finalVersions: Record<string, VersionInfo> = Object.entries(prettifiedVersions).reduce((acc, [name, version]) => {
    acc[name] = { ...version, latest: latestVersionsMap[name] };
    return acc;
  }, {});

  return finalVersions;
}

async function getRepoInfo(repoUrl: string): Promise<RepoInfo> {
  console.log(`Fetching data for ${repoUrl}...`);
  const [owner, repo] = parseRepoUrl(repoUrl);
  const [repoData, pulls, securityAdvisories, dependabotAlerts, codeScanningAlerts, secretScanningAlerts, languages, packageVersions] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.pulls.list({ owner, repo, state: 'open' }),
    octokit.rest.securityAdvisories.listRepositoryAdvisories({ owner, repo }),
    octokit.rest.dependabot.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.codeScanning.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.secretScanning.listAlertsForRepo({ owner, repo, state: 'open' }).catch(() => {}),
    octokit.rest.repos.listLanguages({ owner, repo }),
    getPackageVersions(repoUrl)
  ]);

  return {
    name: repoData.data.full_name,
    description: repoData.data.description ?? '',
    topics: repoData.data.topics ?? [],
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
    lastCommitDate: repoData.data.pushed_at,
    packageVersions,
  };
}

async function getReposInfo(repos: string[]): Promise<RepoInfo[]> {
  const results: RepoInfo[] = [];
  for (const repo of repos) {
    try {
      const info = await getRepoInfo(repo.trim());
      results.push(info);
    } catch (error) {
      console.error(`Error fetching data for ${repo}:`, error);
      process.exit(1);
    }
  }
  return results;
}

async function main() {
  const partialRepoName = process.argv[2] ?? '';
  const reposFile = readFileSync(REPOS_LIST, 'utf8');
  const repos = reposFile
    .split('\n')
    .map(line => line?.trim())
    .filter(line => line && line.startsWith('http'))
    .filter(line => !partialRepoName || line.includes(partialRepoName));

  console.log(`Found ${repos.length} repositories in ${REPOS_LIST}`);
  const reposData = await getReposInfo(repos);

  console.log(`Writing data to ${OUTPUT_FILE} for ${reposData.length} repositories...`);
  writeFileSync(OUTPUT_FILE, JSON.stringify(reposData, null, 2));
}

await main().catch(console.error);

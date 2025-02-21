import { Component, signal, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { RepoInfo, ReposService } from './repos.service';
import { ActivatedRoute, Router, Params } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-repos',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatToolbarModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  template: `
    <mat-form-field class="disable-bottom-line" subscriptSizing="dynamic">
      <mat-label>Filter repositories</mat-label>
      <input matInput [value]="filterValue()" (input)="applyFilter($event)" placeholder="Partial repo or package name..." #input />
      <span matTextSuffix>Repositories: {{ filteredReposCount() }}</span>
    </mat-form-field>
    <div class="scrollable">
      <table class="repos" mat-table [dataSource]="dataSource" matSort>
        <ng-container matColumnDef="name" sticky="true">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Repository</th>
          <td mat-cell *matCellDef="let repo">
            <a mat-icon-button [href]="getCodespacesUrl(repo)" target="_blank" matTooltip="Open in Codespaces">
              <img src="images/codespaces.svg" alt="Open in Codespaces" />
            </a>
            <a class="link" [href]="getBaseUrl(repo)" target="_blank">{{ repo.name }}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="openIssues">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Issues</th>
          <td mat-cell *matCellDef="let repo">
            <a class="link" [href]="getIssuesUrl(repo)" target="_blank">{{ repo.openIssues }}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="openPRs">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>PRs</th>
          <td mat-cell *matCellDef="let repo">
            <a class="link" [href]="getPullRequestsUrl(repo)" target="_blank">{{ repo.openPullRequests }}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="securityIssues">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Security</th>
          <td mat-cell *matCellDef="let repo">
            <div class="security-buttons">
              <a
                class="link"
                [href]="getAdvisoriesUrl(repo)"
                target="_blank"
                *ngIf="repo.securityAlerts.advisories > 0"
              >
                Advisories: {{ repo.securityAlerts.advisories }}
              </a>
              <a
                class="link"
                [href]="getDependabotUrl(repo)"
                target="_blank"
                *ngIf="repo.securityAlerts.dependabot > 0"
              >
                Dependabot: {{ repo.securityAlerts.dependabot }}
              </a>
              <a
                class="link warning"
                [href]="getCodeScanningUrl(repo)"
                target="_blank"
                *ngIf="repo.securityAlerts.codeScanning > 0"
              >
                Code: {{ repo.securityAlerts.codeScanning }}
              </a>
              <a
                class="link error"
                [href]="getSecretScanningUrl(repo)"
                target="_blank"
                *ngIf="repo.securityAlerts.secretScanning > 0"
              >
                Secret: {{ repo.securityAlerts.secretScanning }}
              </a>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="versions">
          <th mat-header-cell *matHeaderCellDef>Versions</th>
          <td mat-cell *matCellDef="let repo">
            <div class="version-pills">
              @for (pkg of getPackageVersions(repo); track pkg.name) {
                <span
                  mat-button
                  #versionMenuTrigger="matMenuTrigger"
                  [matMenuTriggerFor]="versionMenu"
                  [matMenuTriggerData]="{ pkg, repo }"
                  class="version-pill"
                  >{{ pkg.name }}:{{ pkg.short }}</span
                >
              }
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="lastCommitDate">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Commit</th>
          <td mat-cell *matCellDef="let repo">{{ repo.lastCommitDate | date }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

        <!-- Row shown when there is no matching data. -->
        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell" colspan="6">No repository to show.</td>
        </tr>
      </table>

      <mat-menu #versionMenu="matMenu" class="versions-panel">
        <ng-template matMenuContent let-pkg="pkg" let-repo="repo">
          <table class="versions-table">
            <tr>
              <td>Package</td>
              <td>
                <a class="link-primary" href="https://www.npmjs.com/package/{{ pkg.name }}" target="_blank">{{
                  pkg.name
                }}</a>
              </td>
            </tr>
            <tr>
              <td>Current</td>
              <td>{{ pkg.current }}</td>
            </tr>
            <tr>
              <td>Latest</td>
              <td>{{ pkg.latest }}</td>
            </tr>
            <tr>
              <td>Found in</td>
              <td>
                <a class="link-primary" [href]="getFilePath(repo, pkg.foundInPath)" target="_blank">{{
                  pkg.foundInPath
                }}</a>
              </td>
            </tr>
          </table>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [
    `
      .scrollable {
        width: 100%;
        overflow: auto;
      }
      .title {
        font-size: 1rem;
      }
      table {
        background: #fff;
        width: 100%;
      }
      .security-buttons {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .security-buttons .mdc-button {
        padding: 0 8px;
        font-size: var(--mat-sys-body-small);
        height: 16px;
        white-space: nowrap;
      }
      .version-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
      }
      .version-pill {
        font-size: 10px;
        line-height: normal;
        padding: 2px 6px;
        border-radius: 12px;
        background: #e0e0e0;
        white-space: nowrap;
        cursor: pointer;

        &:hover {
          background: #bdbdbd;
        }
      }
      ::ng-deep .mat-mdc-menu-panel.versions-panel {
        background: #fff;
        padding: 10px;

        .mat-mdc-menu-content {
          padding: 0;
        }

        .versions-table {
          td:nth-child(2) {
            padding-left: 10px;
            font-weight: 400;
          }
        }
      }
      .mdc-icon-button {
        vertical-align: middle;
      }
      .mat-mdc-header-row {
        opacity: 0.7;
        font-size: 0.75em;
      }
      .mat-mdc-row:hover {
        background: var(--mat-sys-surface);
      }
      .mat-mdc-form-field {
        width: 100%;
        font-size: 14px;
      }
      .error {
        color: var(--mat-sys-error);
      }
      .warning {
        // darker orange
        color: #f57c00;
      }
    `,
  ],
})
export class ReposComponent implements OnInit {
  readonly repos = signal<RepoInfo[]>([]);
  readonly filteredReposCount = signal<number>(0);
  readonly displayedColumns = ['name', 'openIssues', 'openPRs', 'securityIssues', 'versions', 'lastCommitDate'];
  dataSource: MatTableDataSource<RepoInfo>;
  readonly filterValue = signal<string>('');

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private reposService: ReposService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.dataSource = new MatTableDataSource<RepoInfo>([]);
    this.dataSource.sortingDataAccessor = this.getSortingValue.bind(this);
    this.dataSource.filterPredicate = this.filterPredicate.bind(this);
    this.loadRepos();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: Params) => {
      if (params['filter']) {
        const filterValue = params['filter'];
        this.filterValue.set(filterValue);
        this.dataSource.filter = filterValue.trim().toLowerCase();
        this.filteredReposCount.set(this.dataSource.filteredData.length);
      }
    });
  }

  private getSortingValue(repo: RepoInfo, columnDef: string): string | number {
    switch (columnDef) {
      case 'openIssues':
        return repo.openIssues;
      case 'openPRs':
        return repo.openPullRequests;
      case 'lastCommitDate':
        return new Date(repo.lastCommitDate).getTime();
      case 'securityIssues':
        return (
          repo.securityAlerts.advisories +
          (repo.securityAlerts.dependabot === 'disabled' ? 0 : repo.securityAlerts.dependabot) +
          (repo.securityAlerts.codeScanning === 'disabled' ? 0 : repo.securityAlerts.codeScanning) +
          (repo.securityAlerts.secretScanning === 'disabled' ? 0 : repo.securityAlerts.secretScanning)
        );
      default:
        return (repo as any)[columnDef];
    }
  }

  filterPredicate(data: RepoInfo, filter: string): boolean {
    const searchStr = data.name.toLowerCase();
    const packageVersionsStr = Object.keys(data.packageVersions).join(' ').toLowerCase();
    const transformedFilter = filter.toLowerCase();
    return searchStr.includes(transformedFilter) || packageVersionsStr.includes(transformedFilter);
  }

  async loadRepos() {
    const repoData = await this.reposService.getRepoInfos();
    this.repos.set(repoData);
    this.dataSource.data = repoData;
    this.dataSource.sort = this.sort;
    this.sort.active = 'lastCommitDate';
    this.sort.direction = 'asc';
    this.dataSource.sort = this.sort;

    this.filteredReposCount.set(repoData.length);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue.set(filterValue);
    this.dataSource.filter = filterValue.trim().toLowerCase();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        filter: filterValue,
      },
      queryParamsHandling: 'merge',
    });
  }

  getBaseUrl(repo: RepoInfo): string {
    return `https://github.com/${repo.name}`;
  }

  getFilePath(repo: RepoInfo, path: string): string {
    return `${this.getBaseUrl(repo)}/blob/${repo.defaultBranch ?? 'main'}/${path}`;
  }

  getCodespacesUrl(repo: RepoInfo): string {
    return `https://codespaces.new/${repo.name}?hide_repo_select=true&ref=${repo.defaultBranch ?? 'main'}&quickstart=true`;
  }

  getIssuesUrl(repo: RepoInfo): string {
    return `${this.getBaseUrl(repo)}/issues`;
  }

  getPullRequestsUrl(repo: RepoInfo): string {
    return `${this.getBaseUrl(repo)}/pulls`;
  }

  private getBaseSecurityUrl(repo: RepoInfo): string {
    return `${this.getBaseUrl(repo)}/security`;
  }

  getAdvisoriesUrl(repo: RepoInfo): string {
    return `${this.getBaseSecurityUrl(repo)}/advisories`;
  }

  getDependabotUrl(repo: RepoInfo): string {
    return `${this.getBaseSecurityUrl(repo)}/dependabot`;
  }

  getCodeScanningUrl(repo: RepoInfo): string {
    return `${this.getBaseSecurityUrl(repo)}/code-scanning`;
  }

  getSecretScanningUrl(repo: RepoInfo): string {
    return `${this.getBaseSecurityUrl(repo)}/secret-scanning`;
  }

  getPackageVersions(repo: RepoInfo) {
    return (
      Object.entries(repo.packageVersions)
        // .map(([pkg, version]) => `${pkg}:${version.short}`);
        .map(([pkg, version]) => ({
          ...version,
          name: pkg,
        }))
    );
  }
}

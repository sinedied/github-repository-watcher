import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { RepoInfo, ReposService } from './repos.service';
import { MatToolbarModule } from '@angular/material/toolbar';

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
    MatToolbarModule
  ],
  template: `
    <mat-form-field class="disable-bottom-line" subscriptSizing="dynamic">
      <mat-label>Filter repositories</mat-label>
      <input matInput (keyup)="applyFilter($event)" placeholder="Partial repo or package name..." #input>
      <span matTextSuffix>Repositories: {{filteredReposCount()}}</span>
    </mat-form-field>

    <table class="repos" mat-table [dataSource]="dataSource" matSort>
      <ng-container matColumnDef="name" sticky="true">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Repository</th>
        <td mat-cell *matCellDef="let repo">
          <a class="link" [href]="getBaseUrl(repo)" target="_blank">{{repo.name}}</a>
        </td>
      </ng-container>

      <ng-container matColumnDef="openIssues">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Issues</th>
        <td mat-cell *matCellDef="let repo">
          <a class="link" [href]="getIssuesUrl(repo)" target="_blank">{{repo.openIssues}}</a>
        </td>
      </ng-container>

      <ng-container matColumnDef="openPRs">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>PRs</th>
        <td mat-cell *matCellDef="let repo">
          <a class="link" [href]="getPullRequestsUrl(repo)" target="_blank">{{repo.openPullRequests}}</a>
        </td>
      </ng-container>

      <ng-container matColumnDef="securityIssues">
        <th mat-header-cell *matHeaderCellDef>Security</th>
        <td mat-cell *matCellDef="let repo">
          <div class="security-buttons">
            <a class="link" [href]="getAdvisoriesUrl(repo)" target="_blank" *ngIf="repo.securityAlerts.advisories > 0">
              Advisories: {{repo.securityAlerts.advisories}}
            </a>
            <a class="link" [href]="getDependabotUrl(repo)" target="_blank" *ngIf="repo.securityAlerts.dependabot > 0">
              Dependabot: {{repo.securityAlerts.dependabot}}
            </a>
            <a class="link warning" [href]="getCodeScanningUrl(repo)" target="_blank" *ngIf="repo.securityAlerts.codeScanning > 0">
              Code: {{repo.securityAlerts.codeScanning}}
            </a>
            <a class="link error" [href]="getSecretScanningUrl(repo)" target="_blank" *ngIf="repo.securityAlerts.secretScanning > 0">
              Secret: {{repo.securityAlerts.secretScanning}}
            </a>
          </div>
        </td>
      </ng-container>

      <ng-container matColumnDef="versions">
        <th mat-header-cell *matHeaderCellDef>Versions</th>
        <td mat-cell *matCellDef="let repo">
          <div class="version-pills">
            <span *ngFor="let version of getPackageVersions(repo)" class="version-pill">{{version}}</span>
          </div>
        </td>
      </ng-container>

      <ng-container matColumnDef="lastCommitDate">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Commit</th>
        <td mat-cell *matCellDef="let repo">{{repo.lastCommitDate | date}}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

      <!-- Row shown when there is no matching data. -->
      <tr class="mat-row" *matNoDataRow>
        <td class="mat-cell" colspan="6">No repository to show.</td>
      </tr>
    </table>
  `,
  styles: [`
  .title {
    font-size: 1rem;
  }
    table { width: 100%; }
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
    }
    .mat-mdc-header-row {
      opacity: .7;
      font-size: .75em;
    }
    .mat-mdc-form-field {
      width: 100%;
      font-size: 14px;
    }
    .mat-mdc-table-sticky {
      background: #fff;
      opacity: 1;
    }
    .link {
      color: var(--mat-table-row-item-label-text-color, var(--mat-sys-on-surface, rgba(0, 0, 0, 0.87)));
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }

    .error {
      color: var(--mat-sys-error);
    }
    .warning {
      // darker orange
      color: #f57c00;
    }
  `]
})
export class ReposComponent {
  readonly repos = signal<RepoInfo[]>([]);
  readonly filteredReposCount = signal<number>(0);
  readonly displayedColumns = ['name', 'openIssues', 'openPRs', 'securityIssues', 'versions', 'lastCommitDate'];
  dataSource: MatTableDataSource<RepoInfo>;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private reposService: ReposService) {
    this.dataSource = new MatTableDataSource<RepoInfo>([]);
    this.dataSource.sortingDataAccessor = this.getSortingValue.bind(this);
    this.dataSource.filterPredicate = this.filterPredicate.bind(this);
    this.loadRepos();
  }

  private getSortingValue(repo: RepoInfo, columnDef: string): string | number {
    switch (columnDef) {
      case 'openIssues':
        return repo.openIssues;
      case 'openPRs':
        return repo.openPullRequests;
      case 'lastCommitDate':
        return new Date(repo.lastCommitDate).getTime();
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
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.filteredReposCount.set(this.dataSource.filteredData.length);
  }

  getBaseUrl(repo: RepoInfo): string {
    return `https://github.com/${repo.name}`;
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

  getPackageVersions(repo: RepoInfo): string[] {
    return Object.entries(repo.packageVersions).map(([pkg, version]) => `${pkg}:${version}`);
  }
}

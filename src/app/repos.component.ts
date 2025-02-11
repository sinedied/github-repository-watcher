import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { GitHubService } from './github.service';

@Component({
  standalone: true,
  selector: 'app-repos',
  imports: [CommonModule, MatTableModule, MatChipsModule],
  template: `
    <h2>Repositories</h2>
    <table mat-table [dataSource]="repos()">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Repository</th>
        <td mat-cell *matCellDef="let repo">{{repo.name}}</td>
      </ng-container>

      <ng-container matColumnDef="openIssues">
        <th mat-header-cell *matHeaderCellDef>Issues</th>
        <td mat-cell *matCellDef="let repo">{{repo.openIssues}}</td>
      </ng-container>

      <ng-container matColumnDef="openPRs">
        <th mat-header-cell *matHeaderCellDef>PRs</th>
        <td mat-cell *matCellDef="let repo">{{repo.openPRs}}</td>
      </ng-container>

      <ng-container matColumnDef="securityIssues">
        <th mat-header-cell *matHeaderCellDef>Security</th>
        <td mat-cell *matCellDef="let repo">{{repo.securityIssues}}</td>
      </ng-container>

      <ng-container matColumnDef="technologies">
        <th mat-header-cell *matHeaderCellDef>Technologies</th>
        <td mat-cell *matCellDef="let repo">
          <mat-chip *ngFor="let tech of repo.technologies">{{tech}}</mat-chip>
        </td>
      </ng-container>

      <ng-container matColumnDef="lastCommitDate">
        <th mat-header-cell *matHeaderCellDef>Last Update</th>
        <td mat-cell *matCellDef="let repo">{{repo.lastCommitDate | date}}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  `,
  styles: [`
    table { width: 100%; }
    mat-chip { margin: 0 4px; }
  `]
})
export class ReposComponent {
  readonly repos = signal<any[]>([]);
  readonly displayedColumns = ['name', 'openIssues', 'openPRs', 'securityIssues', 'technologies', 'lastCommitDate'];

  constructor(private github: GitHubService) {
    this.loadRepos();
  }

  async loadRepos() {
    const repoList = await fetch('repo.txt').then(r => r.text());
    const lines = repoList.split('\n').filter(l => l.trim());
    const repoData = await Promise.all(
      lines.map(url => this.github.getRepoInfo(url))
    );
    this.repos.set(repoData);
  }
}

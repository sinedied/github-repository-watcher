import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  standalone: true,
  selector: 'app-repos',
  imports: [CommonModule, MatTableModule, MatChipsModule],
  template: `
    <h2>Repositories</h2>
    <table mat-table [dataSource]="repos()">
      <!-- ...table columns for issues, PRs, security, technologies, last commit... -->
    </table>
  `,
  styles: []
})
export class ReposComponent {
  readonly repos = signal<any[]>([]);

  constructor() {
    this.loadRepos();
  }

  async loadRepos() {
    const repoList = await fetch('repo.txt').then(r => r.text());
    const lines = repoList.split('\n').filter(l => l.trim());
    // ...fetch data from GitHub and populate repos()...
  }
}

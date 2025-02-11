import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'repos', pathMatch: 'full' },
  {
    path: 'repos',
    loadComponent: () => import('./repos.component.js').then(m => m.ReposComponent)
  }
];

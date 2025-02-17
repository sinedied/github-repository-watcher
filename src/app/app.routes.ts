import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./repos.component.js').then(m => m.ReposComponent)
  }
];

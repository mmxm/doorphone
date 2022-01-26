import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {BooksListComponent} from './components/book/books-list/books-list.component';
import {NotFoundComponent} from './components/not-found/not-found.component';
import {AuthorsListComponent} from './components/author/authors-list/authors-list.component';
import {LoginComponent} from './components/login/login.component';
import {AuthorDtListComponent} from './components/author/author-dt-list/author-dt-list.component';
import {BooksDtListComponent} from './components/book/books-dt-list/books-dt-list.component';
import {GestionnaireGuard} from './common/guards/gestionnaire.guard';
import {UsersListComponent} from './components/user/users-list/users-list.component';
import { QrAccessListComponent } from './components/qraccess/qraccess-list/qraccess-list.component';
import { DoorphoneComponent } from './components/doorphone/doorphone.component';

const appRoutes: Routes = [
  {
    path: '',
    children: [
      {path: '', component: BooksListComponent},
      {path: 'authent', component: LoginComponent},
      {path: 'login', component: LoginComponent},
      {path: 'books', component: BooksListComponent},
      {path: 'booksdt', component: BooksDtListComponent, canLoad: [GestionnaireGuard], canActivate: [GestionnaireGuard]},
      {path: 'authors', component: AuthorsListComponent},
      {path: 'authorsdt', component: AuthorDtListComponent},
      {path: 'users', component: UsersListComponent},
      {path: 'qraccess', component: QrAccessListComponent},
      {path: 'doorphone', component: DoorphoneComponent},
      {path: 'gestion', loadChildren: () => import('./gestion/gestion.module').then(m => {
        return m.GestionModule; })}
      // {path: 'gestion', loadChildren: () => import('./gestion/gestion.module').then(m => {
      //   return m.GestionModule; }), canLoad: [GestionnaireGuard], canActivate: [GestionnaireGuard]}
    ]
  },
  {path: '**', component: NotFoundComponent},
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, { relativeLinkResolution: 'legacy' })
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {

}

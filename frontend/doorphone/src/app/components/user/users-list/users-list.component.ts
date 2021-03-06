import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatPaginator, MatPaginatorIntl} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {Observable} from 'rxjs';

import {debounceTime, distinctUntilChanged, startWith, switchMap} from 'rxjs/operators';
import {merge} from 'rxjs';
import {FormControl} from '@angular/forms';

import {ConfirmationDialogComponent} from '../../confirmation-dialog/confirmation-dialog.component';
import {Pagination} from '../../../services/base/pagination.model';
import {Author, AuthorService, UserService} from '../../../services';
import {SubSink} from '../../../services/subsink';
import {AuthorContainerComponent} from '../../../gestion/author/author-container/author-container.component';
import {getAuthorFrenchPaginatorIntl} from './paginator-authors.french';
import {ListParameters} from '../../../services/base/list-parameters.model';
import {UserGroups} from '../../../common/roles/usergroups.model';
import {UserGroupsService} from '../../../common/roles/user-groups.service';
import {roles} from '../../../common/roles/roles.enum';
import {DialogData} from '../../confirmation-dialog/dialog-data.model';
import {AuthService} from '../../../services/authent/auth.service';
import {User} from '../../../services/authent/user.model';
import {UserContainerComponent} from '../../../gestion/user/user-container/user-container.component';


/**
 * Liste des auteurs avec pagination, tris
 */
@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  providers: [{ provide: MatPaginatorIntl, useValue: getAuthorFrenchPaginatorIntl() }]
})
export class UsersListComponent implements OnInit, OnDestroy, AfterViewInit {
  /* Datasource */
  users: User[] = [];
  /**
   * Champs ?? afficher
   */
  columns = ['username', 'full_name', 'email', 'admin'];
  /**
   * Actions sur un auteur
   */
  actions = ['action_delete', 'action_update'];
  /**
   * L'ensemble des colonnes ?? afficher : champs + actions
   */
  // displayedColumns = [...this.columns, ...this.actions];
  displayedColumns = [...this.columns, ...this.actions];
  /**
   * Param??tres du paginator
   */
  total = 0;
  PAGE_SIZE = 5;
  /**
   * progress bar on / off
   */
  loading = false;
  /**
   * lien vers les composants tri et paginator
   */
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  /**
   * FormControl pour la recherche
   */
  search = new FormControl('');
  /**
   * Connect?? et ses groupes
   */
  connecte: UserGroups;
  rolesUser = roles;
  /**
   * Utilitaire subscribe / unsubscribe
   */
  subSink = new SubSink();

  constructor(private router: Router,
              private route: ActivatedRoute,
              private dialog: MatDialog, public snackBar: MatSnackBar,
              private authSvc: AuthService,
              public userGrpsSvc: UserGroupsService,
              private userSvc: UserService) { }
  ngOnInit(): void {
    console.log("ok0")
    this.subSink.sink = this.userGrpsSvc.connecte$.subscribe((connecte) => {
      console.log("ok0.1")
      if (this.userGrpsSvc.hasRole(connecte, roles.gestionnaire)) {
        console.log("ok0.2")
        this.displayedColumns = [...this.columns, ...this.actions];
      }
      this.connecte = connecte;
    });
  }
  ngAfterViewInit(): void {
    console.log("ok1")
    this.subSink.sink = this.userSvc.loading$.subscribe((value) => this._toggleLoading(value));
    this._initDataTable();
  }

  /**
   * ACTIONS sur un auteur
   */
  /**
   * Ajout d'un auteur via une modale
   */
  addUser() {
    this._openUserModale();
  }
  /**
   * Edition d'un auteur via une modale
   * @param {User} user
   */
  editUser(user: User) {
    this._openUserModale(user);
  }
  /**
   * Suppression d'un auteur, apr??s confirmation
   * @param {User} user
   */
  deleteUser(user: User) {
    const data = new DialogData();
    data.title = 'Auteur';
    data.message = `Souhaitez-vous supprimer cet auteur "${user.first_name} ${user.last_name}" ?`;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data });
    dialogRef.updatePosition({top: '50px'});
    this.subSink.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.subSink.sink = this.userSvc.delete(user).subscribe(() => {
          this.snackBar.open(`"${user.first_name} ${user.last_name}" bien supprim??`,
            'Auteur', {duration: 2000, verticalPosition: 'top', horizontalPosition: 'end'});
          this.paginator.pageIndex = 0;
          this._initDataTable();
        });
      }
    });
  }
  isGest() {
    return this.authSvc.isAuthenticated() && this.connecte && this.userGrpsSvc.hasRole(this.connecte, roles.gestionnaire);
  }
  /**
   * Ouverture modale d'??dition d'un auteur
   * @param {Author} author
   * @private
   */
  _openUserModale(user: User = null) {
    const data = user;
    const dialogRef = this.dialog.open(UserContainerComponent, {data});
    dialogRef.updatePosition({top: '50px'});
    dialogRef.updateSize('600px');
    this.subSink.sink = dialogRef.afterClosed().subscribe((result: User) => {
      if (result) {
        this._initDataTable();
      }
    });
  }
  /**
   * Factorisation du switchMap
   * @private
   */
  _switchMap(): Observable<Pagination<User>> {
    const parameters: ListParameters = {
      limit: this.paginator.pageSize, offset: this.paginator.pageIndex * this.paginator.pageSize,
      sort: this.sort.active, order: this.sort.direction,
      keyword: this.search.value
    } as ListParameters;
    return this.userSvc.fetchAll(parameters);
  }
  /**
   * Initialisation data table, ??coutes sur le tri, la pagination et la recherche
   * @private
   */
  _initDataTable() {
    const search$ = this.search.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(),
            switchMap((value) => {
              this.paginator.pageIndex = 0;
              return this._switchMap();
            }));
    const sortPaginate$ = merge(this.sort.sortChange, this.paginator.page)
      .pipe(startWith({}), switchMap((values) => this._switchMap()));

    this.subSink.sink = merge(search$, sortPaginate$)
      .subscribe((data: Pagination<User>) => {
        this._toggleLoading(false);
        if (data) {
          this.total = data.total;
          this.users = data.list;
        }
      });
  }
  _toggleLoading(value) {
    setTimeout(() => this.loading = value);
  }
  ngOnDestroy(): void {
    this.subSink.unsubscribe();
  }
}

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
import {Author, AuthorService, QrAccessService, QrAccess} from '../../../services';
import {SubSink} from '../../../services/subsink';
import {getAuthorFrenchPaginatorIntl} from './paginator-authors.french';
import {ListParameters} from '../../../services/base/list-parameters.model';
import {UserGroups} from '../../../common/roles/usergroups.model';
import {UserGroupsService} from '../../../common/roles/user-groups.service';
import {roles} from '../../../common/roles/roles.enum';
import {DialogData} from '../../confirmation-dialog/dialog-data.model';
import {AuthService} from '../../../services/authent/auth.service';
import {UserContainerComponent} from '../../../gestion/user/user-container/user-container.component';


/**
 * Liste des auteurs avec pagination, tris
 */
@Component({
  selector: 'app-qraccess-list',
  templateUrl: './qraccess-list.component.html',
  styleUrls: ['./qraccess-list.component.css'],
  providers: [{ provide: MatPaginatorIntl, useValue: getAuthorFrenchPaginatorIntl() }]
})
export class QrAccessListComponent implements OnInit, OnDestroy, AfterViewInit {
  /* Datasource */
  qraccesss: QrAccess[] = [];
  /**
   * Champs à afficher
   */
  columns = ['validity_date_start', 'validity_date_end'];
  /**
   * Actions sur un auteur
   */
  actions = ['action_delete', 'action_update'];
  /**
   * L'ensemble des colonnes à afficher : champs + actions
   */
  // displayedColumns = [...this.columns, ...this.actions];
  displayedColumns = [...this.columns, ...this.actions];
  /**
   * Paramétres du paginator
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
   * Connecté et ses groupes
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
              private qraccessSvc: QrAccessService) { }
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
    this.subSink.sink = this.qraccessSvc.loading$.subscribe((value) => this._toggleLoading(value));
    this._initDataTable();
  }

  /**
   * ACTIONS sur un auteur
   */
  /**
   * Ajout d'un auteur via une modale
   */
  addQrAccess() {
    this._openUserModale();
  }
  /**
   * Edition d'un auteur via une modale
   * @param {QrAccess} qraccess
   */
  editQrAccess(qraccess: QrAccess) {
    this._openUserModale(qraccess);
  }
  /**
   * Suppression d'un auteur, après confirmation
   * @param {QrAccess} qraccess
   */
  deleteQrAccess(qraccess: QrAccess) {
    const data = new DialogData();
    data.title = 'Auteur';
    data.message = `Souhaitez-vous supprimer ce code ?`;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data });
    dialogRef.updatePosition({top: '50px'});
    this.subSink.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.subSink.sink = this.qraccessSvc.delete(qraccess).subscribe(() => {
          this.snackBar.open(`Code bien supprimé`,
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
   * Ouverture modale d'édition d'un auteur
   * @param {QrAccess} qraccess
   * @private
   */
  _openUserModale(qraccess: QrAccess = null) {
    const data = qraccess;
    const dialogRef = this.dialog.open(UserContainerComponent, {data});
    dialogRef.updatePosition({top: '50px'});
    dialogRef.updateSize('600px');
    this.subSink.sink = dialogRef.afterClosed().subscribe((result: QrAccess) => {
      if (result) {
        this._initDataTable();
      }
    });
  }
  /**
   * Factorisation du switchMap
   * @private
   */
  _switchMap(): Observable<Pagination<QrAccess>> {
    const parameters: ListParameters = {
      limit: this.paginator.pageSize, offset: this.paginator.pageIndex * this.paginator.pageSize,
      sort: this.sort.active, order: this.sort.direction,
      keyword: this.search.value
    } as ListParameters;
    return this.qraccessSvc.fetchAll(parameters);
  }
  /**
   * Initialisation data table, écoutes sur le tri, la pagination et la recherche
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
      .subscribe((data: Pagination<QrAccess>) => {
        this._toggleLoading(false);
        if (data) {
          this.total = data.total;
          this.qraccesss = data.list;
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

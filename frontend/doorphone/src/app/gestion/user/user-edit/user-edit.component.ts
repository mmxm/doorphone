import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {finalize} from 'rxjs/operators';
import {UserService, Book} from '../../../services';
import {SubSink} from '../../../services/subsink';
import {ToastyService} from "../../../services/toasty/toasty.service";
import {User} from '../../../services/authent/user.model';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent implements OnInit, OnDestroy, OnChanges {
  @Input() user: User;
  @Input() onReturn = 'list'; // 'list' || ''
  @Output() userUpdated = new EventEmitter<User>();

  userForm: FormGroup;
  maxInput = 25;
  loading = false;
  isUpdateMode = false;
  disabled = false;
  formDirty = false;
  subSink = new SubSink();

  constructor(private router: Router, private route: ActivatedRoute,
              private fb: FormBuilder, public snackBar: MatSnackBar,
              private toastySvc: ToastyService,
              private userSvc: UserService) {
  }

  ngOnInit(): void {
    this._initUserIfUpdate();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.user && changes.user.currentValue !== null && changes.user.isFirstChange() &&
      changes.user.currentValue !== changes.user.previousValue) {
      this._initForm(changes.user.currentValue);
    }
  }
  ngOnDestroy(): void {
    this.subSink.unsubscribe();
  }
  /**
   * Sauvegarde de l'auteur
   * A l'issue :
   * - snackbar de confirmation
   * - initialisation du formulaire avec les valeurs (notamment pour l'id qui peut changer de 0 à N si ajout)
   * - notification Output de la sauvegarde
   */
  save() {
    this.disabled = this.loading = true;
    this.userSvc
      .updateOrcreate(this.userForm.value)
      .pipe(finalize(() => this.disabled = this.loading = false))
      .subscribe((user: User) => {
        this.toastySvc.toasty(
          `"${user.first_name} ${user.last_name}" bien ${this.isUpdateMode ? 'mis à jour' : 'ajouté'}`,
          'Auteur');
        this._initForm(user);
        this.userUpdated.emit(user);
      });
  }

  /**
   * Retour à la liste selon le onReturn
   */
  goList() {
    this.userUpdated.emit(null);
    if (this.onReturn === 'list') {
      this.router.navigate(['/users']);
    }
  }
  getLabelCancelOrReturn() {
    if (this.formDirty) {
      return 'Abandonner';
    }
    return 'Fermer';
  }

  /**
   * PRIVATE
   *
   **/

  /**
   * Initialisation du FormGroup avec les contrôles : id, first_name, last_name
   * - on met les valeurs dans le cas d'une modification le cas échéant
   * - on écoute le valueChanges pour détecter toutes modifications des champs => changement du libellé du bouton de gauche
   * @param {User} user : l'auteur [optionnel]
   * @private
   */
  private _initForm(user: User = null) {
    this.isUpdateMode = user && user.id > 0;
    this.userForm = this.fb.group({
      id: [user ? user.id : 0],
      username: [user?.username, Validators.required],
      first_name: [user?.first_name, Validators.required],
      last_name: [user?.last_name, Validators.required]
    });
    this.subSink.sink = this.userForm.valueChanges.subscribe(values => {
      this.formDirty = true;
    });
  }

  /**
   * Recherche d'un auteur par son id, initialisation du formulaire avec ses valeurs
   * @param {number} id : id de l'auteur recherché
   * @private
   */
  private _fetchUser(id: number) {
    this.loading = true;
    this.subSink.sink = this.userSvc
      .fetch(id)
      .pipe(finalize(() => this.loading = false))
      .subscribe((user: User) => {
        this._initForm(user);
      });
  }

  /**
   * Si le component n'est pas inclus dans une modale alors la route est garnie par son id : /author/edit;id=1
   * Si l'author n'est pas injecté via l'Input
   * alors une initialise le formulaire vide
   * @private
   */
  private _initUserIfUpdate() {
    const id = this.route.snapshot.params['id'];
    if (id && id !== '0') {
      this._fetchUser(id);
    } else {
      if (!this.user) {
        this._initForm();
      }
    }
  }
}

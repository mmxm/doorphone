import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {User} from './../authent/user.model';
import {DaoGeneric} from 'data-table';

@Injectable({ providedIn: 'root' })
export class UserDtService extends DaoGeneric<User> {
  private url =  `${environment.baseUrl}/library/users/`;

  constructor(private httpClient: HttpClient) {
    super(httpClient);
  }

  getRootUrl(urlApp?: string): string {
    return this.url;
  }
}

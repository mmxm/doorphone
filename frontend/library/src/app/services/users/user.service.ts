import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {ServiceGeneric} from '../base/service-generic.service';
import {User} from './../authent/user.model';

@Injectable({ providedIn: 'root' })
export class UserService extends ServiceGeneric<User> {
  private url =  `${environment.baseUrl}/library/users/`;

  constructor(private httpClient: HttpClient) {
    super(httpClient);
  }

  getRootUrl(urlApp?: string): string {
    return this.url;
  }
}

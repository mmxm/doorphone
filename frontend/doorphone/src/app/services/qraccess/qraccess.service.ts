import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {ServiceGeneric} from '../base/service-generic.service';
import {QrAccess} from './qraccess.model';

@Injectable({ providedIn: 'root' })
export class QrAccessService extends ServiceGeneric<QrAccess> {
  private url =  `${environment.baseUrl}/library/qraccess/`;

  constructor(private httpClient: HttpClient) {
    super(httpClient);
  }

  getRootUrl(urlApp?: string): string {
    return this.url;
  }
}

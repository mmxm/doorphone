import {Component, Input, OnDestroy, OnInit, ViewChild, ElementRef} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../../services/authent/auth.service';
import {UserGroups} from '../../common/roles/usergroups.model';
import {SubSink} from '../../services/subsink';
import {roles} from '../../common/roles/roles.enum';
// import {SignalingService} from '../../services/rtcvideo/signaling.service';
import {CallService} from '../../services/rtcvideo/call.service';

@Component({
  selector: 'app-doorphone',
  templateUrl: './doorphone.component.html',
  styleUrls: ['./doorphone.component.css']
})
export class DoorphoneComponent implements OnInit, OnDestroy {
  @Input() layout = 'end center';
  @ViewChild('remoteVideo') remoteVideo: ElementRef;
  @ViewChild('remoteAudio') remoteAudio: ElementRef;
  connecte: UserGroups;
  constructor(private router: Router,
              public callSvc: CallService
              ) {
               }

  ngOnInit(): void {

  }


  public async makeCall(): Promise<void> {
    await this.callSvc.makeCall(this.remoteVideo, this.remoteAudio);
    console.log("finished")
  }

  ngOnDestroy(): void {

  }
}

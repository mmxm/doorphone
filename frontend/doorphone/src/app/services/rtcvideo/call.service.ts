import { ElementRef, Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from '@angular/common/http';
import {catchError, finalize, map, publishReplay, refCount} from 'rxjs/operators';
import {AsyncSubject, BehaviorSubject, Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CallService {
  configuration: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302'
        ],
      },
    ],
    // // iceCandidatePoolSize: 10,
  };

  connection: RTCPeerConnection;

  constructor(
              // private signalingService: SignalingService,
              private http: HttpClient
              ) {console.log('ok2')}

  private async _initConnection(remoteVideo: ElementRef, remoteAudio: ElementRef): Promise<void> {
    console.log('ok1')
    this.connection = new RTCPeerConnection(this.configuration);

    await this._getStreams(remoteVideo, remoteAudio);

    this._registerConnectionListeners();
  }

  // public async waitforgathering(): Promise<void> {
  //     if (this.connection.iceGatheringState === 'complete') {
  //       console.log("no wait")
  //       return Promise.resolve();
  //   } else {
  //         const checkState = () => {
  //             if (this.connection.iceGatheringState === 'complete') {
  //               console.log("waited")
  //                 this.connection.removeEventListener('icegatheringstatechange', checkState);
  //                 return Promise.resolve();
  //             }
  //         }
  //       this.connection.addEventListener('icegatheringstatechange', checkState);
  //   }
  // }

  public waitforgathering(): Promise<void>{
    return new Promise(function (resolve, reject) {
      console.log("ok")
    this.connection.addEventListener('icegatheringstatechange', function handler() {
        if (this.connection.iceGatheringState === 'complete') {
          this.connection.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      });
    });
  }


  public async makeCall(remoteVideo: ElementRef, remoteAudio: ElementRef): Promise<void> {
    await this._initConnection(remoteVideo, remoteAudio);
    this.connection.addTransceiver('video', {direction: 'recvonly'});
    console.log('tt')
    var offer = await this.connection.createOffer();

    await this.connection.setLocalDescription(offer);
    // await this.waitforgathering()

    // const gatheringStateObservable = new Observable((observer) => {
    //   const observerstate = () => {
    //     observer.next(this.connection.iceGatheringState);
    //   }
    //   this.connection.addEventListener('icegatheringstatechange', observerstate );
    //   return {
    //     unsubscribe() {
    //       this.connection.removeEventListener('icegatheringstatechange', observerstate);
    //     }
    //   };
    // });
    var that = this;
    await new Promise<void>(function (resolve, reject) {
      that.connection.addEventListener('icegatheringstatechange', function handler() {
        if (that.connection.iceGatheringState === 'complete') {
          that.connection.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      });
    });
    offer = this.connection.localDescription;
    const headers = new HttpHeaders({ 
      'Access-Control-Allow-Origin':'*',
      'Content-Type': 'application/json'
        });
        console.log("Making offer")
        
        // http://localhost:4200/offer
    await new Promise<void>(function (resolve, reject) {
      that.http
        .post<RTCSessionDescription>('http://localhost:4600/offer', JSON.stringify({
          sdp: offer.sdp,
          type: offer.type
        }
        ),{headers}).subscribe(
        response => {
          console.log("Receiving answer");
          that.connection.setRemoteDescription(new RTCSessionDescription(response));
          console.log("Answer received")
          resolve()
        },
        error => {
          console.log(error);
          reject()
        }
      );
    });
    // const sendOffer = () => {
    //   if (this.connection.iceGatheringState === 'complete') {
    //     console.log("waited1")
    //     offer = this.connection.localDescription;
    //     const headers = new HttpHeaders({ 
    //       'Access-Control-Allow-Origin':'*',
    //       'Content-Type': 'application/json'
    //        });
    //        console.log("Making offer")
    //     var that = this;
    //     this.http
    //       .post<RTCSessionDescription>('http://localhost:4200/offer', JSON.stringify({
    //         sdp: offer.sdp,
    //         type: offer.type
    //       }
    //       ),{headers}).subscribe(
    //       response => {
    //         console.log("Receiving answer");
    //         that.connection.setRemoteDescription(new RTCSessionDescription(response));
    //         console.log("Answer received")
    //       },
    //       error => {
    //         console.log(error);
    //       }
    //     );
    //       this.connection.removeEventListener('icegatheringstatechange', sendOffer);
    //       // return Promise.resolve();
    //   }
  // }

  // this.connection.addEventListener('icegatheringstatechange', sendOffer);
  }


  public async handleAnswer(answer: RTCSessionDescription): Promise<void> {
    await this.connection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  public async handleCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (candidate) {
      await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private _registerConnectionListeners(): void {
    this.connection.onicegatheringstatechange = (ev: Event) => {
      console.log(
        `ICE gathering state changed: ${this.connection.iceGatheringState}`
      );
    };

    this.connection.onconnectionstatechange = () => {
      console.log(
        `Connection state change: ${this.connection.connectionState}`
      );
    };

    this.connection.onsignalingstatechange = () => {
      console.log(`Signaling state change: ${this.connection.signalingState}`);
    };

    this.connection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state change: ${this.connection.iceConnectionState}`
      );
    };
    // this.connection.onicecandidate = (event) => {
    //   if (event.candidate) {
    //     const payload = {
    //       type: 'candidate',
    //       candidate: event.candidate.toJSON(),
    //     };
    //     this.signalingService.sendMessage(payload);
    //   }
    // };
  }

  private async _getStreams(remoteVideo: ElementRef, remoteAudio: ElementRef): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
    const remoteStream = new MediaStream();

    remoteVideo.nativeElement.srcObject = remoteStream;

    this.connection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        // if (event.track.kind == "video"){
        //   console.log("ok20 : ", event.track.kind)
        //   remoteStream.addTrack(track);
        //   // remoteVideo.nativeElement.srcObject = event.streams[0]
        // }else{
        //   if (event.track.kind == "audio"){
        //     console.log("ok40 : ", event.track.kind)
        //     remoteAudio.nativeElement.srcObject = event.streams[0]
        //   }
        // }
      });
    };

    stream.getTracks().forEach((track) => {
      console.log("ok30 : ", track.kind)
      this.connection.addTrack(track, stream);
    });
  }
  private _catchError(error: HttpErrorResponse) {
    console.log(error);

    }
}
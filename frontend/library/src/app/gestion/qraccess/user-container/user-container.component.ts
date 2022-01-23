import {Component, Inject, OnInit, Optional} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {User} from '../../../services/authent/user.model';

@Component({
  selector: 'app-user-container',
  templateUrl: './user-container.component.html',
  styleUrls: ['./user-container.component.css']
})
export class UserContainerComponent implements OnInit {
  user = this.data;
  constructor(@Optional() @Inject(MAT_DIALOG_DATA) public data: User,
              public dialogRef: MatDialogRef<UserContainerComponent>) {
  }

  ngOnInit(): void {
  }

  onUserUpdated(user: User) {
    this.dialogRef.close(user);
  }
}

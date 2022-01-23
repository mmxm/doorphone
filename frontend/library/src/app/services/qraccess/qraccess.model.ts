export interface QrAccess {
  qr_code: string;
  validity_date_start: string;
  validity_date_end: string;

  dt_created?: string;
  dt_updated?: string;
}
export interface Citizen {
  id: string;
  nni: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface AcademicRecord {
  id: string;
  citizen_id: string;
  institution: string;
  record_type: string;
  field_of_study: string | null;
  year_awarded: number | null;
  mention: string | null;
  status: 'available' | 'pending' | 'unavailable';
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  citizen_id: string;
  institutions_consented: string[];
  scope: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface Credential {
  id: string;
  citizen_id: string;
  record_id: string;
  credential_hash: string;
  qr_code_url: string | null;
  pdf_url: string | null;
  issued_at: string;
  status: 'active' | 'revoked';
  academic_records?: AcademicRecord;
}

export interface SharingEvent {
  id: string;
  credential_id: string;
  citizen_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_organisation: string | null;
  access_level: 'view_only' | 'download';
  expires_at: string | null;
  share_token: string;
  shared_at: string;
  status: 'active' | 'revoked';
  credentials?: Credential & { academic_records?: AcademicRecord };
}

export interface AuditEvent {
  id: string;
  citizen_id: string | null;
  event_type: string;
  event_detail: Record<string, unknown> | null;
  occurred_at: string;
}

export interface Payment {
  id: string;
  citizen_id: string;
  amount: number;
  method: string | null;
  status: 'pending' | 'completed' | 'failed';
  transaction_id: string | null;
  paid_at: string | null;
}

export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'card' | 'voucher';

/**
 * The subset of CloudKit Web Services wire types this extension uses.
 * Reference: "CloudKit Web Services Reference" (developer.apple.com, archived docs).
 */

export type FieldValue =
  | { type: 'STRING'; value: string }
  | { type: 'INT64'; value: number }
  | { type: 'DOUBLE'; value: number }
  | { type: 'TIMESTAMP'; value: number | null }
  | { type: 'STRING_LIST'; value: string[] }
  | { type: 'INT64_LIST'; value: number[] };

/** Fields as returned by the server. `type` is present on reads. */
export type Fields = Record<string, FieldValue | undefined>;

export interface ZoneID {
  zoneName: string;
  ownerRecordName?: string;
}

export interface CKRecord {
  recordName: string;
  recordType: string;
  recordChangeTag?: string;
  fields: Fields;
  created?: { timestamp: number; userRecordName?: string };
  modified?: { timestamp: number; userRecordName?: string };
  deleted?: boolean;
}

/** A per-record failure inside an otherwise-successful response. */
export interface CKRecordError {
  recordName?: string;
  reason?: string;
  serverErrorCode: string;
  retryAfter?: number;
  uuid?: string;
}

export type RecordResult = CKRecord | CKRecordError;

export function isRecordError(r: RecordResult): r is CKRecordError {
  return typeof (r as CKRecordError).serverErrorCode === 'string';
}

export type OperationType =
  | 'create'
  | 'update'
  | 'forceUpdate'
  | 'replace'
  | 'forceReplace'
  | 'delete'
  | 'forceDelete';

export interface RecordOperation {
  operationType: OperationType;
  record: Partial<CKRecord> & { recordName?: string; recordType?: string };
  desiredKeys?: string[];
}

export interface Filter {
  fieldName: string;
  comparator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'LESS_THAN'
    | 'LESS_THAN_OR_EQUALS'
    | 'GREATER_THAN'
    | 'GREATER_THAN_OR_EQUALS'
    | 'IN'
    | 'NOT_IN'
    | 'CONTAINS_ALL_TOKENS'
    | 'LIST_CONTAINS'
    | 'BEGINS_WITH';
  fieldValue: { value: unknown; type?: string };
}

export interface Query {
  recordType: string;
  filterBy?: Filter[];
  sortBy?: { fieldName: string; ascending: boolean }[];
}

export interface QueryResponse {
  records: RecordResult[];
  continuationMarker?: string;
}

export interface ModifyResponse {
  records: RecordResult[];
}

export interface UserIdentity {
  userRecordName: string;
  nameComponents?: { givenName?: string; familyName?: string };
  lookupInfo?: { emailAddress?: string };
}

/** Body of the 421 response that signals "sign in required". */
export interface AuthRequiredResponse {
  uuid?: string;
  serverErrorCode: 'AUTHENTICATION_REQUIRED';
  reason?: string;
  redirectURL: string;
}

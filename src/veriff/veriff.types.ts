import { ClientAuthorizationData } from '@tonomy/tonomy-id-sdk';

export type DocumentField = {
  confidenceCategory?: 'high' | 'medium' | 'low' | null;
  value: string | null;
  sources?: ('VIZ' | 'MRZ' | 'NFC' | 'BARCODE')[];
};

export type VeriffWebhookPayload = {
  status: 'success' | 'fail';
  eventType: 'fullauto';
  sessionId: string;
  attemptId: string;
  vendorData: string | null;
  endUserId: string | null;
  version: string;
  acceptanceTime: string;
  time: string;
  data: {
    verification: {
      decisionScore: number | null;
      decision:
        | 'approved'
        | 'declined'
        | 'resubmission_requested'
        | 'expired'
        | 'abandoned';
      person: {
        [fieldName: string]: (DocumentField & { components?: any }) | null;
      };
      document: {
        type?:
          | (DocumentField & {
              value: string | null;
            })
          | null;
        country?: DocumentField | null;
        number?: DocumentField;
        validFrom?: DocumentField;
        validUntil?: DocumentField;
        issuedBy?: DocumentField;
        firstIssue?: any;
        placeOfIssue?: any;
        processNumber?: any;
        residencePermitType?: any;
        licenseNumber?: any;
        [extra: string]: DocumentField | null | undefined;
      };
      insights:
        | {
            label: string;
            result: 'yes' | 'likelyYes' | 'no' | 'notApplicable';
            category: string;
          }[]
        | null;
    };
  };
};

// --------- Watchlist Screening Result Type ---------
export type WatchlistScreeningResult = {
  checkType: 'initial_result' | 'updated_result';
  attemptId: string;
  sessionId: string;
  vendorData: string | null;
  endUserId: string | null;
  matchStatus: 'possible_match' | 'no_match';
  searchTerm: {
    name: string;
    year: string;
  };
  totalHits: number;
  createdAt: string;
  hits: WatchlistHit[];
};

export type WatchlistHit = {
  matchedName: string;
  countries: string[];
  dateOfBirth: string;
  dateOfDeath: string | null;
  matchTypes: string[];
  aka: string[];
  associates: string[];
  listingsRelatedToMatch: {
    warnings?: ListingEntry[];
    sanctions?: ListingEntry[];
    fitnessProbity?: ListingEntry[];
    pep?: ListingEntry[];
    adverseMedia?: MediaEntry[];
  };
};

export type ListingEntry = {
  sourceName: string;
  sourceUrl: string;
  date: string | null;
};

export type MediaEntry = {
  sourceName: string;
  sourceUrl: string;
  date: string | null;
};

export interface VerifiedClientAuthorization<
  T extends ClientAuthorizationData = object,
> {
  request: {
    jwt: string;
    id: string;
    origin?: string; // this is not verified
  };
  did: string;
  account: string;
  username?: string;
  data: T;
}

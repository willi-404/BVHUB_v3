export interface MemberGroup { id: string; membershipId: string; name: string; active: boolean; }
export interface Member { id: string; displayName: string; role: string; active: boolean; groups?: MemberGroup[]; }

export interface RequestSession {
  authVersion: number;
  devUserId: string | null;
}

// Tokens may rotate within a session; login/logout and development-user changes may not.
export function sameRequestSession(expected: RequestSession, current: RequestSession): boolean {
  return expected.authVersion === current.authVersion && expected.devUserId === current.devUserId;
}

export type UserRole = 'OWNER' | 'WORKER';

export interface UserProfile {
  role: UserRole;
  userName: string;
}

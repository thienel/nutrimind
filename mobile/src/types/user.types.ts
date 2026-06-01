export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

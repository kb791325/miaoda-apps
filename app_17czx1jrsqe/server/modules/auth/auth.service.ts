import { Injectable } from '@nestjs/common';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  position: string;
  dataScope: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class AuthService {
  private userRoles = new Map<string, string>();
  private userProfiles = new Map<string, UserProfile>();

  getUserProfile(userId: string, name: string): UserProfile {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    const profile: UserProfile = {
      id: userId,
      username: `user_${userId}`,
      name,
      avatar: '',
      department: '',
      role: 'admin',
      position: '',
      dataScope: 'all',
    };

    this.userProfiles.set(userId, profile);
    this.userRoles.set(userId, 'admin');
    return profile;
  }

  setUserRole(userId: string, role: string) {
    this.userRoles.set(userId, role);
    const profile = this.userProfiles.get(userId);
    if (profile) {
      profile.role = role;
      profile.dataScope = role === 'admin' ? 'all' : role === 'manager' ? 'department' : 'self';
    }
  }
}

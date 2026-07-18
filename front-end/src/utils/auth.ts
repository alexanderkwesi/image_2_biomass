// app/utils/auth.ts
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export class AuthManager {
  private static USER_KEY = 'app_user_data';
  private static TOKEN_KEY = 'app_auth_token';
  private static listeners: Array<(user: User | null) => void> = [];

  static login(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Simulate API call
      setTimeout(() => {
        if (email && password) {
          const user: User = {
            id: Date.now().toString(),
            email,
            name: email.split('@')[0],
            createdAt: new Date(),
          };
          
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          localStorage.setItem(this.TOKEN_KEY, `token_${Date.now()}`);
          
          this.listeners.forEach(listener => listener(user));
          resolve(user);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500);
    });
  }

  static logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.listeners.forEach(listener => listener(null));
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        user.createdAt = new Date(user.createdAt);
        return user;
      } catch {
        return null;
      }
    }
    return null;
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  static subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}
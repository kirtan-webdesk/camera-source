export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
}

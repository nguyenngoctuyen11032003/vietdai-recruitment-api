export type AccessTokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
};

export type AuthenticatedRequest = {
  user?: AuthenticatedUser;
  headers?: Record<string, string | string[] | undefined>;
};



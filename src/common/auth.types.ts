export type AuthJwtPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
};

export type RequestUser = {
  id: string;
  email: string;
  role: string;
};


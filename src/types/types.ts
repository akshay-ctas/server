export interface JwtPayload {
  sub: string;
  role: 'admin' | 'customer' | 'manager';
}

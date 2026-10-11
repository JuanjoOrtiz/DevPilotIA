/** Una cuenta. `passwordHash` nunca sale de la API: ver `toPublicUser`. */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

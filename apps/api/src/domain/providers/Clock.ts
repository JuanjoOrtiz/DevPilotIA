/** La hora actual, inyectada para que los tests puedan fijarla. */
export interface Clock {
  now(): Date;
}

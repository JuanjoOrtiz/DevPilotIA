import type { Clock } from '../../domain/providers/Clock.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

import type { HealthResponse } from '@devpilot/shared';
import type { DatabaseHealthProbe } from '../../domain/providers/DatabaseHealthProbe.js';

/** Estado de la API y de la base de datos, para `GET /api/v1/health`. */
export class CheckHealth {
  private readonly database: DatabaseHealthProbe;
  private readonly version: string;

  constructor(database: DatabaseHealthProbe, version: string) {
    this.database = database;
    this.version = version;
  }

  async execute(): Promise<HealthResponse> {
    const reachable = await this.database.isReachable();

    return {
      status: reachable ? 'ok' : 'degraded',
      database: reachable ? 'up' : 'down',
      version: this.version,
    };
  }
}

/** Comprueba si la base de datos responde. La implementación vive en infrastructure. */
export interface DatabaseHealthProbe {
  isReachable(): Promise<boolean>;
}

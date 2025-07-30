// Service loader to lazy load heavy dependencies
export class ServiceLoader {
  private static hederaServicePromise: Promise<any> | null = null;
  private static hashConnectServicePromise: Promise<any> | null = null;

  static async getHederaService() {
    if (!this.hederaServicePromise) {
      this.hederaServicePromise = import('./hederaService').then(module => module.hederaService);
    }
    return this.hederaServicePromise;
  }

  static async getHashConnectService() {
    if (!this.hashConnectServicePromise) {
      this.hashConnectServicePromise = import('./hashConnectService').then(module => module.hashConnectService);
    }
    return this.hashConnectServicePromise;
  }

  // Preload services when user interaction is likely
  static preloadServices() {
    // Start loading services in background
    this.getHederaService().catch(console.error);
    this.getHashConnectService().catch(console.error);
  }
}

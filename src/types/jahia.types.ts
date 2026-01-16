export interface JahiaModule {
  id: string;
  name: string;
  version: string;
}

export interface UtilsVersions {
  allModules: JahiaModule[];
  dependencies: JahiaModule[];
  jahia: {
    build: string;
    fullVersion: string;
    version: string;
  };
  module: JahiaModule;
}

export interface UtilsPlatform {
  cluster: {
    isActivated: boolean;
  };
  jahia: {
    database: {
      driverName: string;
      driverVersion: string;
      name: string;
      type: string;
      url: string;
      version: string;
    };
    system: {
      java: {
        runtimeName: string;
        runtimeVerison: string;
        vendor: string;
        vendorVersion: string;
      };
      os: {
        architecture: string;
        name: string;
        version: string;
      };
    };
    version: {
      build: string;
      buildDate: string;
      isSnapshot: string;
      release: string;
    };
  };
}

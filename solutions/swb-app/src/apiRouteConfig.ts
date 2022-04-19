import {
  HostingAccountService,
  EnvironmentConnectionService,
  EnvironmentLifecycleService
} from '@amzn/environments';

export interface ApiRouteConfig {
  routes: ApiRoute[];
  environments: { [key: string]: Environment };
  account: HostingAccountService;
}

export interface ApiRoute {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any;
  serviceAction: string;
  httpMethod: HTTPMethod;
}

export interface Environment {
  lifecycle: EnvironmentLifecycleService;
  connection: EnvironmentConnectionService;
}

export type HTTPMethod = 'post' | 'put' | 'delete' | 'get';

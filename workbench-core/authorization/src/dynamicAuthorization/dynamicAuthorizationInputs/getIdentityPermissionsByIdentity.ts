import { IdentityPermission, IdentityType } from './identityPermission';

/**
 * Request object for GetIdentityPermissionsByIdentity
 */
export interface GetIdentityPermissionsByIdentityRequest {
  /**
   * {@link IdentityType}
   */
  identityType: IdentityType;
  /**
   * Identity id associated to the {@link IdentityPermission}s
   */
  identityId: string;
}
/**
 * Response object for GetIdentityPermissionsByIdentity
 */
export interface GetIdentityPermissionsByIdentityResponse {
  /**
   * An array of {@link IdentityPermission} associated to the identity
   */
  identityPermissions: IdentityPermission[];
}

import { AuthenticatedUser } from '../../authenticatedUser';

/**
 * Request object for GetGroupUsers
 */
export interface GetGroupUsersRequest {
  /**
   * {@link AuthenticatedUser}
   */
  authenticatedUser: AuthenticatedUser;
  /**
   * Group id required for retrieval of users
   */
  groupId: string;
}
/**
 * Response object for GetGroupUsers
 */
export interface GetGroupUsersResponse {
  /**
   * A list of user ids associated to the group
   */
  userIds: string[];
}

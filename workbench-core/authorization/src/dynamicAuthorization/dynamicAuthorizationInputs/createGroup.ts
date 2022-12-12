import { AuthenticatedUser } from '../../authenticatedUser';

/**
 * Request object for CreateGroup
 */
export interface CreateGroupRequest {
  /**
   * {@link AuthenticatedUser}
   */
  authenticatedUser: AuthenticatedUser;

  /**
   * GroupID being created
   * GroupID must be unique
   */
  groupId: string;

  /**
   * Description of group
   */
  description?: string;
}

/**
 * Response object for CreateGroup
 */
export interface CreateGroupResponse {
  /**
   * States whether the group was successfully created
   */
  created: boolean;
}

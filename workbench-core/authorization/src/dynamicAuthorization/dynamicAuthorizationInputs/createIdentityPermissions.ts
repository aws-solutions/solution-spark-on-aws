/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticatedUser } from '../../authenticatedUser';
import { IdentityPermission } from './identityPermission';

/**
 * Request object for CreateIdentityPermissions
 */
export interface CreateIdentityPermissionsRequest {
  /**
   * {@link AuthenticatedUser}
   */
  authenticatedUser: AuthenticatedUser;
  /**
   * An array of {@link IdentityPermission} to be created
   */
  identityPermissions: IdentityPermission[];
}

/**
 * Response object for CreateIdentityPermissions
 */
export interface CreateIdentityPermissionsResponse {
  /**
   * The data object returned
   */
  data: {
    /**
     * An array of {@link IdentityPermission}s created
     */
    identityPermissions: IdentityPermission[];
  };
}

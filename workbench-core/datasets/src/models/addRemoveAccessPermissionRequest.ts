/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { DataSetPermissionParser } from './dataSetPermission';

// eslint-disable-next-line @rushstack/typedef-var
export const AddRemoveAccessPermissionParser = z.object({
  /** the logged in User */
  authenticatedUserId: z.string(),
  /** the logged in User Roles */
  roles: z.array(z.string()),
  /** the ID of the dataset */
  dataSetId: z.string(),
  /** the permission to add or remove */
  permission: DataSetPermissionParser
});

export type AddRemoveAccessPermissionRequest = z.infer<typeof AddRemoveAccessPermissionParser>;

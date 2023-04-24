/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { resourceTypeToKey, z } from '@aws/workbench-core-base';

// eslint-disable-next-line @rushstack/typedef-var
export const GetProjectEnvTypeConfigRequestParser = z
  .object({
    envTypeId: z.string().etId().required(),
    envTypeConfigId: z.string().swbId(resourceTypeToKey.envTypeConfig).required(),
    projectId: z.string().swbId(resourceTypeToKey.project).required()
  })
  .strict();

export type GetProjectEnvTypeConfigRequest = z.infer<typeof GetProjectEnvTypeConfigRequestParser>;

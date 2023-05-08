/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { z } from '@aws/workbench-core-base';

// eslint-disable-next-line @rushstack/typedef-var
export const TerminateEnvironmentRequestParser = z.object({
  projectId: z.string().projId().required(),
  environmentId: z.string().envId().required()
});

export type TerminateEnvironmentRequest = z.infer<typeof TerminateEnvironmentRequestParser>;

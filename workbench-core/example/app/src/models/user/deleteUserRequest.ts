/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

// eslint-disable-next-line @rushstack/typedef-var
export const DeleteUserRequestParser = z
  .object({
    userId: z.string().min(1)
  })
  .strict();

export type DeleteUserRequest = z.infer<typeof DeleteUserRequestParser>;
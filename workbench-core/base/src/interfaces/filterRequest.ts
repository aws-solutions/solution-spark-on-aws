/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { QueryParameterFilter } from './queryParameterFilter';

export interface FilterRequest {
  [key: string]: QueryParameterFilter<unknown> | undefined;
}
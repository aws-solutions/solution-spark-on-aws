/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// Schema for createAccount API
import { Schema } from 'jsonschema';

const CreateCostCenterSchema: Schema = {
  id: '/createAccount',
  type: 'object',
  properties: {
    name: { type: 'string' },
    dependency: { type: 'string' },
    description: { type: 'string' }
  },
  additionalProperties: false,
  required: ['name', 'dependency', 'description']
};

export default CreateCostCenterSchema;

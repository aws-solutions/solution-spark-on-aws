/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// Schema for createDataSet API
import { Schema } from 'jsonschema';

const CreateDataSetSchema: Schema = {
  id: '/createDataSet',
  type: 'object',
  properties: {
    name: { type: 'string' },
    storageName: { type: 'string' },
    path: { type: 'string' },
    awsAccountId: { type: 'string' },
    region: { type: 'string' },
    type: { type: 'string' },
    owner: { type: 'string' }
  },
  additionalProperties: false,
  required: ['name', 'storageName', 'path', 'awsAccountId', 'region', 'type', 'owner']
};

export default CreateDataSetSchema;

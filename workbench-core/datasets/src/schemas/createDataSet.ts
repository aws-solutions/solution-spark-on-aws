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
    datasetName: { type: 'string' },
    path: { type: 'string' },
    region: { type: 'string' }
  },
  additionalProperties: false,
  required: ['datasetName', 'path', 'region']
};

export default CreateDataSetSchema;

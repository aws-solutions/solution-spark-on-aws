/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// Schema for GetTemplate API
import { Schema } from 'jsonschema';

const AwsAccountTemplateUrlsSchema: Schema = {
    id: '/getTemplate',
    type: 'object',
    properties: {
        externalId: { type: 'string' }
    },
    additionalProperties: false,
    required: ['externalId']
};

export default AwsAccountTemplateUrlsSchema;
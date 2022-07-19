// Schema for createEnvironmentType API
import { Schema } from 'jsonschema';

const CreateEnvironmentTypeSchema: Schema = {
  id: '/createEnvironmentType',
  type: 'object',
  properties: {
    productId: { type: 'string' },
    provisioningArtifact: { type: 'string' },
    allowedRoleIds: {
      type: 'array',
      items: { type: 'string' }
    },
    type: { type: 'string' },
    description: { type: 'string' },
    name: { type: 'string' },
    params: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    },
    status: { type: 'string' }
  },
  required: ['allowedRoleIds', 'type', 'description', 'name', 'params', 'status']
};

export default CreateEnvironmentTypeSchema;

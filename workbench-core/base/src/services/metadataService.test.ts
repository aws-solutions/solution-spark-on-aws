/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { AttributeValue, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import AwsService from '../aws/awsService';
import Query from '../aws/helpers/dynamoDB/query';
import resourceTypeToKey from '../constants/resourceTypeToKey';
import { MetadataService } from './metadataService';

describe('metadata service', () => {
  let awsService: AwsService;
  let metadataService: MetadataService;

  beforeEach(() => {
    awsService = new AwsService({ region: 'test' });
    metadataService = new MetadataService(awsService);
  });

  test('should return mapping metadata successfully', () => {
    interface EntityTest {
      id: string;
      sk: string;
      pk: string;
    }
    interface EntityA extends EntityTest {
      productName: string;
    }
    interface EntityB extends EntityTest {
      projectName: string;
      projectType: string;
    }
    interface EntityAMetadata extends EntityTest {
      entityBProject: string;
      entityBProjectType: string;
    }
    interface EntityBMetadata extends EntityTest {
      entityAProduct: string;
    }
    const mapperA = (entityA: EntityA, entityB: EntityB): EntityAMetadata => {
      return {
        id: entityB.id,
        sk: entityB.pk,
        pk: entityA.pk,
        entityBProject: entityB.projectName,
        entityBProjectType: entityB.projectType
      };
    };
    const mapperB = (entityA: EntityA, entityB: EntityB): EntityBMetadata => {
      return { id: entityA.id, sk: entityA.pk, pk: entityB.pk, entityAProduct: entityA.productName };
    };
    const entityA: EntityA = { id: 'etityAId', sk: 'etityASk', pk: 'etityAPk', productName: 'Product' };
    const entityB: EntityB = {
      id: 'etityBId',
      sk: 'etityBSk',
      pk: 'etityBPk',
      projectName: 'Project',
      projectType: 'Type 1'
    };

    const result: { mainEntityMetadata: EntityAMetadata[]; dependencyMetadata: EntityBMetadata[] } = {
      mainEntityMetadata: [
        {
          id: entityB.id,
          sk: entityB.pk,
          pk: entityA.pk,
          entityBProject: entityB.projectName,
          entityBProjectType: entityB.projectType
        }
      ],
      dependencyMetadata: [
        {
          id: entityA.id,
          sk: entityA.pk,
          pk: entityB.pk,
          entityAProduct: entityA.productName
        }
      ]
    };

    expect(metadataService.getMetadataItems(entityA, [entityB], mapperA, mapperB)).toMatchObject(result);
  });

  test('should list dependent entity metadata', async () => {
    const expected: Record<string, AttributeValue>[] = [{ a: { N: '123.45' } }];
    const envPk = `${resourceTypeToKey.environment}#id`;

    const output: QueryCommandOutput = { $metadata: {}, Items: expected };

    const query = new Query({ region: 'test' }, 'test');
    query.execute = jest.fn(() => {
      console.log('execute');
      return Promise.resolve(output);
    });

    awsService.helpers.ddb.query = jest.fn(() => {
      console.log('queery');
      return query;
    });

    const result = await metadataService.listDependentMetadata(envPk, resourceTypeToKey.dataset);
    expect(result).toEqual(expected);
  });
});

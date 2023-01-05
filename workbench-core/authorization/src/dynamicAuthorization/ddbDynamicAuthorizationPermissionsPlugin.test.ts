/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  DynamoDBClient,
  ServiceInputTypes,
  ServiceOutputTypes,
  TransactWriteItemsCommand,
  TransactionCanceledException,
  QueryCommand,
  AttributeValue
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { AwsService, JSONValue } from '@aws/workbench-core-base';
import { mockClient, AwsStub } from 'aws-sdk-client-mock';
import _ from 'lodash';
import { Action } from '../action';
import { AuthenticatedUser } from '../authenticatedUser';
import { Effect } from '../effect';
import { IdentityPermissionCreationError } from '../errors/identityPermissionCreationError';
import { ThroughputExceededError } from '../errors/throughputExceededError';
import { DDBDynamicAuthorizationPermissionsPlugin } from './ddbDynamicAuthorizationPermissionsPlugin';
import { IdentityPermission, IdentityType } from './dynamicAuthorizationInputs/identityPermission';

describe('DDB Dynamic Authorization Permissions Plugin tests', () => {
  let region: string;
  let ddbTableName;
  let mockAuthenticatedUser: AuthenticatedUser;

  let dynamoDBDynamicPermissionsPlugin: DDBDynamicAuthorizationPermissionsPlugin;
  let awsService: AwsService;
  let mockDDB: AwsStub<ServiceInputTypes, ServiceOutputTypes>;

  let sampleGroupId: string;
  let sampleGroupType: IdentityType;

  let sampleAction: Action;
  let sampleEffect: Effect;
  let sampleSubjectType: string;
  let sampleSubjectId: string;
  let sampleConditions: Record<string, JSONValue>;
  let sampleFields: string[];
  let sampleDescription: string;

  let mockIdentityPermission: IdentityPermission;
  let mockIdentityPermissionItem: Record<string, AttributeValue>;
  let samplePartitionKey: string;
  let sampleSortKey: string;
  let sampleGroupIdentity: string;

  let base64PaginationToken: string;
  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache

    ddbTableName = 'PermissionsTable';
    region = 'us-east-1';
    mockAuthenticatedUser = {
      id: 'sampleUserId',
      roles: []
    };

    awsService = new AwsService({ region, ddbTableName });
    dynamoDBDynamicPermissionsPlugin = new DDBDynamicAuthorizationPermissionsPlugin({
      dynamoDBService: awsService.helpers.ddb
    });

    mockDDB = mockClient(DynamoDBClient);

    sampleGroupId = 'sampleGroup';
    sampleGroupType = 'GROUP';
    sampleAction = 'CREATE';
    sampleEffect = 'ALLOW';
    sampleSubjectType = 'sampleSubjectType';
    sampleSubjectId = 'sampleSubjectId';
    sampleConditions = {};
    sampleFields = [];
    sampleDescription = 'sampleDescription';
    mockIdentityPermission = {
      action: sampleAction,
      effect: sampleEffect,
      subjectType: sampleSubjectType,
      subjectId: sampleSubjectId,
      identityId: sampleGroupId,
      identityType: sampleGroupType,
      conditions: sampleConditions,
      fields: sampleFields,
      description: sampleDescription
    };

    samplePartitionKey = `${sampleSubjectType}|${sampleSubjectId}`;
    sampleSortKey = `${sampleAction}|${sampleEffect}|${sampleGroupType}|${sampleGroupId}`;
    sampleGroupIdentity = `${sampleGroupType}|${sampleGroupId}`;
    mockIdentityPermissionItem = {
      pk: { S: samplePartitionKey },
      sk: { S: sampleSortKey },
      action: { S: sampleAction },
      effect: { S: sampleEffect },
      subjectType: { S: sampleSubjectType },
      subjectId: { S: sampleSubjectId },
      identity: { S: sampleGroupIdentity },
      conditions: { M: marshall(sampleConditions) },
      fields: { L: [] },
      description: { S: sampleDescription }
    };
    base64PaginationToken = 'eyJwayI6InNhbXBsZVN1YmplY3RUeXBlfHNhbXBsZVN1YmplY3RJZCJ9';
  });

  describe('isRouteIgnored', () => {
    it('throws a not implemented exception', async () => {
      await expect(
        dynamoDBDynamicPermissionsPlugin.isRouteIgnored({ route: '', method: 'GET' })
      ).rejects.toThrow(Error);
    });
  });

  describe('isRouteProtected', () => {
    it('throws a not implemented exception', async () => {
      await expect(
        dynamoDBDynamicPermissionsPlugin.isRouteProtected({ route: '', method: 'GET' })
      ).rejects.toThrow(Error);
    });
  });

  describe('getDynamicOperationsByRoute', () => {
    it('throws a not implemented exception', async () => {
      await expect(
        dynamoDBDynamicPermissionsPlugin.getDynamicOperationsByRoute({ route: '', method: 'GET' })
      ).rejects.toThrow(Error);
    });
  });

  describe('getIdentityPermissionsBySubject', () => {
    test('Get identity permissions by subject, filter on action and groupId', async () => {
      const keyConditionExpression = '#pk = :pk AND begins_with ( #sk, :sk )';
      const filterExpression = '#id IN ( :id0 )';
      const attributeNames = { '#pk': 'pk', '#sk': 'sk', '#id': 'identity' };
      const attributeValues = {
        ':pk': { S: `${sampleSubjectType}|${sampleSubjectId}` },
        ':sk': { S: sampleAction },
        ':id0': { S: sampleGroupIdentity }
      };
      mockDDB
        .on(QueryCommand, {
          FilterExpression: filterExpression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues,
          KeyConditionExpression: keyConditionExpression
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem]
        });

      const response = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
        subjectId: sampleSubjectId,
        subjectType: sampleSubjectType,
        action: sampleAction,
        identities: [{ identityId: sampleGroupId, identityType: sampleGroupType }]
      });
      expect(response.data.identityPermissions).toStrictEqual([mockIdentityPermission]);
    });

    test('Get identity permissions by subject, filter on action', async () => {
      const keyConditionExpression = '#pk = :pk AND begins_with ( #sk, :sk )';
      const attributeNames = { '#pk': 'pk', '#sk': 'sk' };
      const attributeValues = {
        ':pk': { S: `${sampleSubjectType}|${sampleSubjectId}` },
        ':sk': { S: sampleAction }
      };
      mockDDB
        .on(QueryCommand, {
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues,
          KeyConditionExpression: keyConditionExpression
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem]
        });

      const response = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
        subjectId: sampleSubjectId,
        subjectType: sampleSubjectType,
        action: sampleAction
      });
      expect(response.data.identityPermissions).toStrictEqual([mockIdentityPermission]);
    });

    test('Get identity permissions by subject, filter on groupId', async () => {
      const keyConditionExpression = '#pk = :pk';
      const filterExpression = '#id IN ( :id0 )';
      const attributeNames = { '#pk': 'pk', '#id': 'identity' };
      const attributeValues = {
        ':pk': { S: `${sampleSubjectType}|${sampleSubjectId}` },
        ':id0': { S: sampleGroupIdentity }
      };
      mockDDB
        .on(QueryCommand, {
          FilterExpression: filterExpression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues,
          KeyConditionExpression: keyConditionExpression
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem]
        });

      const response = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
        subjectId: sampleSubjectId,
        subjectType: sampleSubjectType,
        identities: [{ identityId: sampleGroupId, identityType: sampleGroupType }]
      });
      expect(response.data.identityPermissions).toStrictEqual([mockIdentityPermission]);
    });

    test('Get identity permissions by subject with pagination token', async () => {
      const keyConditionExpression = '#pk = :pk';
      const filterExpression = '#id IN ( :id0 )';
      const attributeNames = { '#pk': 'pk', '#id': 'identity' };
      const attributeValues = {
        ':pk': { S: `${sampleSubjectType}|${sampleSubjectId}` },
        ':id0': { S: sampleGroupIdentity }
      };
      mockDDB
        .on(QueryCommand, {
          FilterExpression: filterExpression,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues,
          KeyConditionExpression: keyConditionExpression
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem],
          LastEvaluatedKey: { pk: { S: samplePartitionKey } }
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem]
        });
      const { data, paginationToken } =
        await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
          subjectId: sampleSubjectId,
          subjectType: sampleSubjectType,
          identities: [{ identityId: sampleGroupId, identityType: sampleGroupType }]
        });
      expect(data.identityPermissions).toStrictEqual([mockIdentityPermission]);
      expect(paginationToken).toStrictEqual(base64PaginationToken);

      const nextResponse = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
        subjectId: sampleSubjectId,
        subjectType: sampleSubjectType,
        identities: [{ identityId: sampleGroupId, identityType: sampleGroupType }]
      });
      expect(nextResponse.data.identityPermissions).toStrictEqual([mockIdentityPermission]);
      expect(nextResponse.paginationToken).toBeUndefined();
    });
    test('Exceed identity limitation, throw ThroughputExceededError', async () => {
      const exceededIdentities = Array(101).fill({
        identityId: sampleGroupId,
        identityType: sampleGroupType
      });
      await expect(
        dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
          subjectId: sampleSubjectId,
          subjectType: sampleSubjectType,
          identities: exceededIdentities
        })
      ).rejects.toThrow(ThroughputExceededError);
    });
    test('Get identity permissions by subject, no items returned', async () => {
      mockDDB.on(QueryCommand).resolvesOnce({});

      const response = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsBySubject({
        subjectId: sampleSubjectId,
        subjectType: sampleSubjectType,
        identities: [{ identityId: sampleGroupId, identityType: sampleGroupType }]
      });
      expect(response.data.identityPermissions).toStrictEqual([]);
    });
  });

  describe('createIdentityPermissions tests', () => {
    let failedIdentityPermission: IdentityPermission;
    beforeAll(() => {
      failedIdentityPermission = {
        action: sampleAction,
        effect: sampleEffect,
        subjectType: sampleSubjectType,
        subjectId: sampleSubjectId,
        identityId: sampleGroupId,
        identityType: sampleGroupType,
        conditions: sampleConditions,
        fields: sampleFields
      };
    });
    test('Create identity permissions', async () => {
      const mockIdentityPermissions: IdentityPermission[] = [mockIdentityPermission];
      mockDDB.on(TransactWriteItemsCommand).resolvesOnce({});

      const response = await dynamoDBDynamicPermissionsPlugin.createIdentityPermissions({
        identityPermissions: mockIdentityPermissions,
        authenticatedUser: mockAuthenticatedUser
      });
      expect(response.data.identityPermissions).toBe(mockIdentityPermissions);
    });
    test('Create identity permissions, with no conditions, fields, and descriptions', async () => {
      const mockIdentityPermissions: IdentityPermission[] = [
        _.omit(mockIdentityPermission, ['fields', 'conditions', 'description'])
      ];
      mockDDB.on(TransactWriteItemsCommand).resolvesOnce({});

      const response = await dynamoDBDynamicPermissionsPlugin.createIdentityPermissions({
        identityPermissions: mockIdentityPermissions,
        authenticatedUser: mockAuthenticatedUser
      });
      expect(response.data.identityPermissions).toBe(mockIdentityPermissions);
    });
    test('Create identity permissions with one failed should throw IdentityPermissionCreationError', async () => {
      const mockTransactionCanceledException = new TransactionCanceledException({
        message:
          'Transaction cancelled, please refer cancellation reasons for specific reasons [ConditionalCheckFailed]',
        $metadata: {}
      });
      const mockIdentityPermissions: IdentityPermission[] = [
        mockIdentityPermission,
        failedIdentityPermission
      ];
      mockDDB.on(TransactWriteItemsCommand).rejects(mockTransactionCanceledException);

      await expect(
        dynamoDBDynamicPermissionsPlugin.createIdentityPermissions({
          identityPermissions: mockIdentityPermissions,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(IdentityPermissionCreationError);
    });

    test('Create identity permissions that exceeds 100 identity permissions should throw ThroughputExceededError', async () => {
      const identityPermissions = Array(101).fill(mockIdentityPermission);
      await expect(
        dynamoDBDynamicPermissionsPlugin.createIdentityPermissions({
          identityPermissions,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(ThroughputExceededError);
    });

    test('Create identity permissions with unknown error thrown', async () => {
      mockDDB.on(TransactWriteItemsCommand).rejects(new Error('Random error should be caught'));
      await expect(
        dynamoDBDynamicPermissionsPlugin.createIdentityPermissions({
          identityPermissions: [mockIdentityPermission],
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(Error);
    });
  });

  describe('getIdentityPermissionsByIdentity', () => {
    test('Get identity permissions by identity', async () => {
      mockDDB.on(QueryCommand).resolvesOnce({
        Items: [mockIdentityPermissionItem]
      });
      const { data } = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsByIdentity({
        identityId: sampleGroupId,
        identityType: sampleGroupType
      });

      expect(data.identityPermissions).toStrictEqual([mockIdentityPermission]);
    });

    test('Get identity permissions by identity with zero permissions', async () => {
      mockDDB.on(QueryCommand).resolvesOnce({
        Items: []
      });
      const { data } = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsByIdentity({
        identityId: sampleGroupId,
        identityType: sampleGroupType
      });

      expect(data.identityPermissions).toStrictEqual([]);
    });

    test('Get identity permissions by identity with pagination token', async () => {
      mockDDB
        .on(QueryCommand, {
          IndexName: 'getIdentityPermissionsByIdentity'
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem],
          LastEvaluatedKey: { pk: { S: samplePartitionKey } }
        })
        .resolvesOnce({
          Items: [mockIdentityPermissionItem]
        });

      const { data, paginationToken } =
        await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsByIdentity({
          identityId: sampleGroupId,
          identityType: sampleGroupType
        });
      expect(data.identityPermissions).toStrictEqual([mockIdentityPermission]);
      expect(paginationToken).toStrictEqual(base64PaginationToken);
      const nextResponse = await dynamoDBDynamicPermissionsPlugin.getIdentityPermissionsByIdentity({
        identityId: sampleGroupId,
        identityType: sampleGroupType,
        paginationToken
      });
      expect(nextResponse.data.identityPermissions).toStrictEqual([mockIdentityPermission]);
      expect(nextResponse.paginationToken).toBeUndefined();
    });
  });
  describe('deleteIdentityPermissions', () => {
    it('throws a not implemented exception', async () => {
      await expect(
        dynamoDBDynamicPermissionsPlugin.deleteIdentityPermissions({
          authenticatedUser: mockAuthenticatedUser,
          identityPermissions: []
        })
      ).rejects.toThrow(Error);
    });
  });
});

/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

jest.mock('@aws/workbench-core-audit');
jest.mock('@aws/workbench-core-authorization');
jest.mock('@aws/workbench-core-logging');
jest.mock('./dataSetMetadataPlugin');
jest.mock('./wbcDataSetsAuthorizationPlugin');

import { AuditService, BaseAuditPlugin, Writer } from '@aws/workbench-core-audit';
import {
  DDBDynamicAuthorizationPermissionsPlugin,
  DynamicAuthorizationService,
  WBCGroupManagementPlugin
} from '@aws/workbench-core-authorization';
import { AwsService, DynamoDBService } from '@aws/workbench-core-base';
import { LoggingService } from '@aws/workbench-core-logging';
import { CognitoUserManagementPlugin, UserManagementService } from '@aws/workbench-core-user-management';
import * as Boom from '@hapi/boom';
import { DataSetService } from './dataSetService';
import { DdbDataSetMetadataPlugin } from './ddbDataSetMetadataPlugin';
import { DataSetHasEndpointError } from './errors/dataSetHasEndpointError';
import { DataSetNotFoundError } from './errors/dataSetNotFoundError';
import { EndpointExistsError } from './errors/endpointExistsError';
import { EndpointNotFoundError } from './errors/endpointNotFoundError';
import { InvalidEndpointError } from './errors/invalidEndpointError';
import { NotAuthorizedError } from './errors/notAuthorizedError';
import { AddDataSetExternalEndpointResponse } from './models/addDataSetExternalEndpoint';
import { AddRemoveAccessPermissionRequest } from './models/addRemoveAccessPermissionRequest';
import { DataSet } from './models/dataSet';
import { DataSetsAccessLevel } from './models/dataSetsAccessLevel';
import { GetDataSetMountPointResponse } from './models/getDataSetMountPoint';
import { PermissionsResponse } from './models/permissionsResponse';
import { StorageLocation } from './models/storageLocation';
import { S3DataSetStoragePlugin } from './s3DataSetStoragePlugin';
import { WbcDataSetsAuthorizationPlugin } from './wbcDataSetsAuthorizationPlugin';

describe('DataSetService', () => {
  let writer: Writer;
  let audit: AuditService;
  let log: LoggingService;
  let aws: AwsService;
  let ddbService: DynamoDBService;
  let groupManagementPlugin: WBCGroupManagementPlugin;
  let permissionsPlugin: DDBDynamicAuthorizationPermissionsPlugin;
  let authzService: DynamicAuthorizationService;
  let metaPlugin: DdbDataSetMetadataPlugin;
  let authzPlugin: WbcDataSetsAuthorizationPlugin;
  let s3Plugin: S3DataSetStoragePlugin;
  let dataSetService: DataSetService;

  const mockDataSetId = 'sampleDataSetId';
  const mockInvalidId = 'Sample-Invalid-Id';
  const mockDataSetName = 'Sample-DataSet';
  const mockDataSetPath = 'sample-s3-prefix';
  const mockAwsAccountId = 'Sample-AWS-Account';
  const mockAwsBucketRegion = 'Sample-AWS-Bucket-Region';
  const mockDataSetStorageType = 'S3';
  const mockDataSetStorageName = 'S3-Bucket';
  const mockAccessPointName = 'Sample-Access-Point';
  const mockAccessPointAlias = `${mockAccessPointName}-s3alias`;
  const mockRoleArn = 'Sample-Role-Arn';
  const mockAlternateRoleArn = 'Another-Sample-Role-Arn';
  const mockExistingEndpointName = 'Sample-Existing-AP';
  const mockExistingEndpointId = 'Sample-Endpoint-Id';
  const mockNoRolesEndpointId = 'Sample-NoRoles-Endpoint-Id';
  const mockDataSetWithEndpointId = 'sampleDataSetWithEndpointId';
  const mockEndPointUrl = `s3://arn:s3:us-east-1:${mockAwsAccountId}:accesspoint/${mockAccessPointName}/${mockDataSetPath}/`;
  const mockDataSetObject = 'datasetObjectId';
  const mockPresignedSinglePartUploadURL = 'Sample-Presigned-Single-Part-Upload-Url';
  const mockGroupId = 'Sample-Group-Id';
  const mockUserId = 'sample-user-id';
  const mockAuthenticatedUser = {
    id: mockUserId,
    roles: []
  };
  const mockCreatedAt = new Date().toISOString();
  const mockAccessLevel: DataSetsAccessLevel = 'read-only';

  const mockDataSetAddAccessParams: AddRemoveAccessPermissionRequest = {
    authenticatedUser: mockAuthenticatedUser,
    dataSetId: mockDataSetId,
    permission: {
      accessLevel: 'read-only',
      identityType: 'USER',
      identity: mockUserId
    }
  };
  const mockAddAccessResponse: PermissionsResponse = {
    data: {
      dataSetId: mockDataSetId,
      permissions: [
        {
          identity: mockUserId,
          identityType: 'USER',
          accessLevel: 'read-only'
        }
      ]
    }
  };

  beforeEach(() => {
    jest.resetAllMocks();
    expect.hasAssertions();

    writer = {
      prepare: jest.fn(),
      write: jest.fn()
    };
    audit = new AuditService(new BaseAuditPlugin(writer), true);
    aws = new AwsService({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'fakeKey',
        secretAccessKey: 'fakeSecret'
      }
    });
    ddbService = new DynamoDBService({ region: 'us-east-1', table: 'fakeTable' });
    groupManagementPlugin = new WBCGroupManagementPlugin({
      userManagementService: new UserManagementService(new CognitoUserManagementPlugin('fakeUserPool', aws)),
      ddbService: ddbService,
      userGroupKeyType: 'GROUP'
    });
    permissionsPlugin = new DDBDynamicAuthorizationPermissionsPlugin({
      dynamoDBService: ddbService
    });
    authzService = new DynamicAuthorizationService({
      groupManagementPlugin: groupManagementPlugin,
      dynamicAuthorizationPermissionsPlugin: permissionsPlugin,
      auditService: audit
    });
    authzPlugin = new WbcDataSetsAuthorizationPlugin(authzService);
    log = new LoggingService();
    metaPlugin = new DdbDataSetMetadataPlugin(aws, 'DS', 'EP');

    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'listDataSets').mockImplementation(async () => {
      return [
        {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        }
      ];
    });
    jest
      .spyOn(DdbDataSetMetadataPlugin.prototype, 'getDataSetMetadata')
      .mockImplementation(async (id: string): Promise<DataSet> => {
        if (id === mockDataSetWithEndpointId) {
          return {
            id: mockDataSetWithEndpointId,
            name: mockDataSetName,
            path: mockDataSetPath,
            awsAccountId: mockAwsAccountId,
            storageType: mockDataSetStorageType,
            storageName: mockDataSetStorageName,
            externalEndpoints: [mockExistingEndpointName],
            createdAt: mockCreatedAt
          };
        } else if (id === mockInvalidId) {
          throw Boom.notFound(`Could not find DataSet '${mockInvalidId}'.`);
        }
        return {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        };
      });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'listDataSetObjects').mockImplementation(async () => {
      return [mockDataSetObject];
    });
    jest
      .spyOn(DdbDataSetMetadataPlugin.prototype, 'getDataSetObjectMetadata')
      .mockImplementation(async () => {
        return {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName
        };
      });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'addDataSet').mockImplementation(async () => {
      return {
        id: mockDataSetId,
        name: mockDataSetName,
        path: mockDataSetPath,
        awsAccountId: mockAwsAccountId,
        storageType: mockDataSetStorageType,
        storageName: mockDataSetStorageName,
        createdAt: mockCreatedAt
      };
    });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'updateDataSet').mockImplementation(async () => {
      return {
        id: mockDataSetId,
        name: mockDataSetName,
        path: mockDataSetPath,
        awsAccountId: mockAwsAccountId,
        storageType: mockDataSetStorageType,
        storageName: mockDataSetStorageName,
        externalEndpoints: [mockAccessPointName],
        createdAt: mockCreatedAt
      };
    });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'removeDataSet').mockImplementation(async () => {});
    jest
      .spyOn(DdbDataSetMetadataPlugin.prototype, 'getDataSetEndPointDetails')
      .mockImplementation(async (dataSetId: string, endpointId: string) => {
        if (endpointId === mockNoRolesEndpointId) {
          return {
            id: mockExistingEndpointId,
            name: mockExistingEndpointName,
            dataSetId: mockDataSetId,
            dataSetName: mockDataSetName,
            path: mockDataSetPath,
            endPointUrl: mockEndPointUrl,
            endPointAlias: mockAccessPointAlias,
            createdAt: mockCreatedAt,
            accessLevel: mockAccessLevel
          };
        }
        return {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          path: mockDataSetPath,
          endPointUrl: mockEndPointUrl,
          endPointAlias: mockAccessPointAlias,
          allowedRoles: [mockRoleArn],
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'addExternalEndpoint').mockImplementation(async () => {
      return {
        id: mockExistingEndpointId,
        name: mockExistingEndpointName,
        dataSetId: mockDataSetId,
        dataSetName: mockDataSetName,
        path: mockDataSetPath,
        endPointUrl: mockEndPointUrl,
        endPointAlias: mockAccessPointAlias,
        allowedRoles: [mockRoleArn],
        createdAt: mockCreatedAt,
        accessLevel: mockAccessLevel
      };
    });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'listEndpointsForDataSet').mockImplementation(async () => {
      return [
        {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          path: mockDataSetPath,
          endPointUrl: mockEndPointUrl,
          endPointAlias: mockAccessPointAlias,
          allowedRoles: [mockRoleArn],
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        }
      ];
    });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'updateExternalEndpoint').mockImplementation(async () => {
      return {
        id: mockExistingEndpointId,
        name: mockExistingEndpointName,
        dataSetId: mockDataSetId,
        dataSetName: mockDataSetName,
        path: mockDataSetPath,
        endPointUrl: mockEndPointUrl,
        endPointAlias: mockAccessPointAlias,
        allowedRoles: [mockRoleArn, mockAlternateRoleArn],
        createdAt: mockCreatedAt,
        accessLevel: mockAccessLevel
      };
    });
    jest.spyOn(DdbDataSetMetadataPlugin.prototype, 'listStorageLocations').mockImplementation(async () => {
      return [
        {
          name: mockDataSetStorageName,
          awsAccountId: mockAwsAccountId,
          type: mockDataSetStorageType,
          region: mockAwsBucketRegion
        }
      ];
    });

    jest.spyOn(S3DataSetStoragePlugin.prototype, 'getStorageType').mockImplementation(() => {
      return mockDataSetStorageType;
    });
    jest.spyOn(S3DataSetStoragePlugin.prototype, 'createStorage').mockImplementation(async () => {
      return `s3://${mockDataSetStorageName}/${mockDataSetPath}/`;
    });
    jest.spyOn(S3DataSetStoragePlugin.prototype, 'importStorage').mockImplementation(async () => {
      return `s3://${mockDataSetStorageName}/${mockDataSetPath}/`;
    });
    jest.spyOn(S3DataSetStoragePlugin.prototype, 'addExternalEndpoint').mockImplementation(async () => {
      return {
        data: {
          connections: {
            endPointUrl: mockEndPointUrl,
            endPointAlias: mockAccessPointAlias
          }
        }
      };
    });
    jest.spyOn(S3DataSetStoragePlugin.prototype, 'removeExternalEndpoint').mockImplementation(async () => {});
    jest
      .spyOn(S3DataSetStoragePlugin.prototype, 'addRoleToExternalEndpoint')
      .mockImplementation(async () => {});
    jest
      .spyOn(S3DataSetStoragePlugin.prototype, 'removeRoleFromExternalEndpoint')
      .mockImplementation(async () => {});
    jest
      .spyOn(S3DataSetStoragePlugin.prototype, 'createPresignedUploadUrl')
      .mockImplementation(async () => mockPresignedSinglePartUploadURL);

    dataSetService = new DataSetService(audit, log, metaPlugin, authzPlugin);
    s3Plugin = new S3DataSetStoragePlugin(aws);

    jest
      .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'addAccessPermission')
      .mockImplementation(async () => mockAddAccessResponse);

    jest
      .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'removeAccessPermissions')
      .mockImplementation(async () => mockAddAccessResponse);

    jest
      .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions')
      .mockImplementation(async () => mockAddAccessResponse);

    jest
      .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAllDataSetAccessPermissions')
      .mockImplementation(async () => mockAddAccessResponse);
  });

  describe('constructor', () => {
    it('sets a private audit and log service', () => {
      const testService = new DataSetService(audit, log, metaPlugin, authzPlugin);

      expect(testService[`_audit`]).toBe(audit);
      expect(testService[`_log`]).toBe(log);
    });
  });

  describe('provisionDataset', () => {
    it('calls createStorage and addDataSet', async () => {
      await expect(
        dataSetService.provisionDataSet({
          name: mockDataSetName,
          storageName: mockDataSetStorageName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          region: mockAwsBucketRegion,
          storageProvider: s3Plugin,
          authenticatedUser: mockAuthenticatedUser
        })
      ).resolves.toMatchObject<DataSet>({
        id: mockDataSetId,
        name: mockDataSetName,
        path: mockDataSetPath,
        storageName: mockDataSetStorageName,
        awsAccountId: mockAwsAccountId,
        storageType: mockDataSetStorageType,
        createdAt: mockCreatedAt
      });
      expect(metaPlugin.addDataSet).toBeCalledTimes(1);
      expect(s3Plugin.createStorage).toBeCalledTimes(1);
    });
  });

  describe('importDataset', () => {
    it('calls importStorage and addDataSet ', async () => {
      await expect(
        dataSetService.importDataSet({
          name: 'name',
          storageName: 'storageName',
          path: 'path',
          awsAccountId: 'accountId',
          region: 'bucketRegion',
          storageProvider: s3Plugin,
          authenticatedUser: mockAuthenticatedUser
        })
      ).resolves.toMatchObject<DataSet>({
        id: mockDataSetId,
        name: mockDataSetName,
        path: mockDataSetPath,
        storageName: mockDataSetStorageName,
        awsAccountId: mockAwsAccountId,
        storageType: mockDataSetStorageType,
        createdAt: mockCreatedAt
      });
      expect(metaPlugin.addDataSet).toBeCalledTimes(1);
      expect(s3Plugin.importStorage).toBeCalledTimes(1);
    });
  });

  describe('removeDataset', () => {
    it('returns nothing when the dataset is removed', async () => {
      await expect(
        dataSetService.removeDataSet(mockDataSetId, () => Promise.resolve(), mockAuthenticatedUser)
      ).resolves.not.toThrow();
    });

    it('throws when an external endpoint exists on the DataSet.', async () => {
      await expect(
        dataSetService.removeDataSet(
          mockDataSetWithEndpointId,
          () => Promise.resolve(),
          mockAuthenticatedUser
        )
      ).rejects.toThrow(
        new DataSetHasEndpointError(
          'External endpoints found on Dataset must be removed before DataSet can be removed.'
        )
      );
    });

    it('throws when preconditions are not met', async () => {
      await expect(
        dataSetService.removeDataSet(
          mockDataSetId,
          async () => {
            await Promise.reject(new Error('Preconditions are not met'));
          },
          mockAuthenticatedUser
        )
      ).rejects.toThrow('Preconditions are not met');
    });
  });

  describe('getDataSetMountObject', () => {
    it('returns endpoint attributes when called by an authenticated user with user permissions on the dataset.', async () => {
      dataSetService.getDataSet = jest.fn();

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          endPointAlias: mockAccessPointAlias,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: mockEndPointUrl,
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).resolves.toMatchObject<GetDataSetMountPointResponse>({
        data: {
          mountObject: {
            name: mockDataSetName,
            prefix: mockDataSetPath,
            bucket: mockAccessPointAlias,
            endpointId: mockExistingEndpointId
          }
        }
      });
    });
    it('returns endpoint attributes when called by an authenticated user with group permissions on the dataset.', async () => {
      dataSetService.getDataSet = jest.fn();

      jest
        .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions')
        .mockImplementation(async () => ({
          data: {
            dataSetId: mockDataSetId,
            permissions: [{ accessLevel: 'read-only', identityType: 'GROUP', identity: mockGroupId }]
          }
        }));

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          endPointAlias: mockAccessPointAlias,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: mockEndPointUrl,
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: { id: mockUserId, roles: [mockGroupId] }
        })
      ).resolves.toMatchObject<GetDataSetMountPointResponse>({
        data: {
          mountObject: {
            name: mockDataSetName,
            prefix: mockDataSetPath,
            bucket: mockAccessPointAlias,
            endpointId: mockExistingEndpointId
          }
        }
      });
    });

    it('throws DataSetNotFoundError when called with a name that does not have an alias.', async () => {
      dataSetService.getDataSet = jest.fn().mockRejectedValueOnce(new DataSetNotFoundError());

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: '',
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(DataSetNotFoundError);
    });

    it('throws EndpointNotFoundError when called with a name that does not have an alias.', async () => {
      dataSetService.getDataSet = jest.fn();

      dataSetService.getExternalEndPoint = jest.fn().mockRejectedValueOnce(new EndpointNotFoundError());

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(EndpointNotFoundError);
    });

    it('throws InvalidEndpointError when called with a name that does not have an alias.', async () => {
      dataSetService.getDataSet = jest.fn();

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: '',
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(InvalidEndpointError);
    });

    it('throws NotAuthorizedError when the authenticated user doesnt have permission to access the dataSet.', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: []
        }
      });
      dataSetService.getDataSet = jest.fn();

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          endPointAlias: mockAccessPointAlias,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: '',
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(NotAuthorizedError);
    });

    it('throws NotAuthorizedError when the authenticated user doesnt have sufficient permissions to access the endpoint.', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: [{ identity: mockUserId, identityType: 'USER', accessLevel: 'read-only' }]
        }
      });
      dataSetService.getDataSet = jest.fn();

      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          name: mockExistingEndpointName,
          endPointAlias: mockAccessPointAlias,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: '',
          createdAt: mockCreatedAt,
          accessLevel: 'read-write' as DataSetsAccessLevel
        };
      });

      await expect(
        dataSetService.getDataSetMountObject({
          dataSetId: mockDataSetId,
          endpointId: mockExistingEndpointId,
          authenticatedUser: mockAuthenticatedUser
        })
      ).rejects.toThrow(NotAuthorizedError);
    });
  });

  describe('listDataSets', () => {
    it('returns an array of known DataSets.', async () => {
      await expect(dataSetService.listDataSets(mockAuthenticatedUser)).resolves.toMatchObject<DataSet[]>([
        {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        }
      ]);
    });
  });

  describe('getDataSet', () => {
    it('returns a the details of a DataSet.', async () => {
      await expect(
        dataSetService.getDataSet(mockDataSetName, mockAuthenticatedUser)
      ).resolves.toMatchObject<DataSet>({
        id: mockDataSetId,
        name: mockDataSetName,
        path: mockDataSetPath,
        awsAccountId: mockAwsAccountId,
        storageType: mockDataSetStorageType,
        storageName: mockDataSetStorageName,
        createdAt: mockCreatedAt
      });
    });
    it('throws when an invalid dataset Id is given.', async () => {
      try {
        await dataSetService.getDataSet(mockInvalidId, mockAuthenticatedUser);
      } catch (error) {
        expect(Boom.isBoom(error, 404)).toBe(true);
        expect(error.message).toBe(`Could not find DataSet '${mockInvalidId}'.`);
      }
    });
  });

  describe('addDataSetExternalEndpointForGroup', () => {
    it('returns the mount object for the DataSet mount point', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: [{ identity: mockGroupId, identityType: 'GROUP', accessLevel: 'read-only' }]
        }
      });
      await expect(
        dataSetService.addDataSetExternalEndpointForGroup({
          dataSetId: mockDataSetId,
          externalEndpointName: mockAccessPointName,
          storageProvider: s3Plugin,
          groupId: mockGroupId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).resolves.toMatchObject<AddDataSetExternalEndpointResponse>({
        data: {
          mountObject: {
            name: mockDataSetName,
            bucket: mockAccessPointAlias,
            prefix: mockDataSetPath,
            endpointId: mockExistingEndpointId
          }
        }
      });
    });

    it('throws if the external endpoint already exists.', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: [{ identity: mockGroupId, identityType: 'GROUP', accessLevel: 'read-write' }]
        }
      });

      await expect(
        dataSetService.addDataSetExternalEndpointForGroup({
          dataSetId: mockDataSetWithEndpointId,
          externalEndpointName: mockExistingEndpointName,
          storageProvider: s3Plugin,
          groupId: mockGroupId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).rejects.toThrow(EndpointExistsError);
    });

    it('throws if the subject doesnt have permission to access the dataset', async () => {
      jest
        .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions')
        .mockResolvedValue({ data: { dataSetId: mockDataSetId, permissions: [] } });

      await expect(
        dataSetService.addDataSetExternalEndpointForGroup({
          dataSetId: mockDataSetWithEndpointId,
          externalEndpointName: mockExistingEndpointName,
          storageProvider: s3Plugin,
          groupId: mockGroupId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).rejects.toThrow(NotAuthorizedError);
    });
  });

  describe('addDataSetExternalEndpointForUser', () => {
    it('returns the mount object for the DataSet mount point', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: [{ identity: mockUserId, identityType: 'USER', accessLevel: 'read-write' }]
        }
      });
      await expect(
        dataSetService.addDataSetExternalEndpointForUser({
          dataSetId: mockDataSetId,
          externalEndpointName: mockAccessPointName,
          storageProvider: s3Plugin,
          userId: mockUserId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).resolves.toMatchObject<AddDataSetExternalEndpointResponse>({
        data: {
          mountObject: {
            name: mockDataSetName,
            bucket: mockAccessPointAlias,
            prefix: mockDataSetPath,
            endpointId: mockExistingEndpointId
          }
        }
      });
    });

    it('throws if the external endpoint already exists.', async () => {
      jest.spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions').mockResolvedValue({
        data: {
          dataSetId: mockDataSetId,
          permissions: [{ identity: mockUserId, identityType: 'USER', accessLevel: 'read-only' }]
        }
      });

      await expect(
        dataSetService.addDataSetExternalEndpointForUser({
          dataSetId: mockDataSetWithEndpointId,
          externalEndpointName: mockExistingEndpointName,
          storageProvider: s3Plugin,
          userId: mockUserId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).rejects.toThrow(EndpointExistsError);
    });

    it('throws if the subject doesnt have permission to access the dataset', async () => {
      jest
        .spyOn(WbcDataSetsAuthorizationPlugin.prototype, 'getAccessPermissions')
        .mockResolvedValue({ data: { dataSetId: mockDataSetId, permissions: [] } });

      await expect(
        dataSetService.addDataSetExternalEndpointForUser({
          dataSetId: mockDataSetWithEndpointId,
          externalEndpointName: mockExistingEndpointName,
          storageProvider: s3Plugin,
          userId: mockUserId,
          authenticatedUser: mockAuthenticatedUser,
          externalRoleName: mockRoleArn
        })
      ).rejects.toThrow(NotAuthorizedError);
    });
  });

  describe('removeDataSetExternalEndpoint', () => {
    it('returns nothing after removing DataSet mount point', async () => {
      dataSetService.getDataSet = jest.fn(async () => {
        return {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          externalEndpoints: [mockExistingEndpointName],
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        };
      });
      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          endPointAlias: mockAccessPointAlias,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: mockEndPointUrl,
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.removeDataSetExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).resolves.not.toThrow();
    });

    it('throws DataSetNotFoundError if the dataset does not exist', async () => {
      dataSetService.getDataSet = jest.fn().mockRejectedValueOnce(new DataSetNotFoundError());

      await expect(
        dataSetService.removeDataSetExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).rejects.toThrow(DataSetNotFoundError);
    });

    it('throws EndpointNotFoundError if endpointId does not exist on dataset', async () => {
      dataSetService.getDataSet = jest.fn(async () => {
        return {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          externalEndpoints: [],
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        };
      });
      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          endPointAlias: mockAccessPointAlias,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: mockEndPointUrl,
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.removeDataSetExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).rejects.toThrow(EndpointNotFoundError);
    });

    it('throws EndpointNotFoundError if the dataset has no external endpoints', async () => {
      dataSetService.getDataSet = jest.fn(async () => {
        return {
          id: mockDataSetId,
          name: mockDataSetName,
          path: mockDataSetPath,
          awsAccountId: mockAwsAccountId,
          storageType: mockDataSetStorageType,
          storageName: mockDataSetStorageName,
          createdAt: mockCreatedAt
        };
      });
      dataSetService.getExternalEndPoint = jest.fn(async () => {
        return {
          id: mockExistingEndpointId,
          endPointAlias: mockAccessPointAlias,
          name: mockExistingEndpointName,
          path: mockDataSetPath,
          dataSetId: mockDataSetId,
          dataSetName: mockDataSetName,
          endPointUrl: mockEndPointUrl,
          createdAt: mockCreatedAt,
          accessLevel: mockAccessLevel
        };
      });

      await expect(
        dataSetService.removeDataSetExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).rejects.toThrow(EndpointNotFoundError);
    });
  });

  describe('addRoleToExternalEndpoint', () => {
    it('no-op if the role has already been added to the endpoint.', async () => {
      await expect(
        dataSetService.addRoleToExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          mockRoleArn,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).resolves.toBeUndefined();
    });

    it('completes if given an unknown role arn.', async () => {
      await expect(
        dataSetService.addRoleToExternalEndpoint(
          mockDataSetId,
          mockExistingEndpointId,
          mockAlternateRoleArn,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).resolves.toBeUndefined();
    });

    it('completes if given an existing endpoint with no stored roles', async () => {
      await expect(
        dataSetService.addRoleToExternalEndpoint(
          mockDataSetId,
          mockNoRolesEndpointId,
          mockRoleArn,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('listStorageLocations', () => {
    it('returns an array of known StorageLocations.', async () => {
      await expect(dataSetService.listStorageLocations(mockAuthenticatedUser)).resolves.toMatchObject<
        StorageLocation[]
      >([
        {
          name: mockDataSetStorageName,
          awsAccountId: mockAwsAccountId,
          type: mockDataSetStorageType,
          region: mockAwsBucketRegion
        }
      ]);
    });
  });

  describe('getSinglePartPresignedUrl', () => {
    it('returns a presigned URL.', async () => {
      const ttlSeconds = 3600;
      const fileName = 'test.txt';

      await expect(
        dataSetService.getPresignedSinglePartUploadUrl(
          mockDataSetId,
          fileName,
          ttlSeconds,
          s3Plugin,
          mockAuthenticatedUser
        )
      ).resolves.toStrictEqual(mockPresignedSinglePartUploadURL);
    });
  });

  describe('addDataSetAccessPermissions', () => {
    it('returns access permissions added to a DataSet', async () => {
      await expect(
        dataSetService.addDataSetAccessPermissions(mockDataSetAddAccessParams)
      ).resolves.toStrictEqual(mockAddAccessResponse);
    });
    it('throws when the dataSet does not exist', async () => {
      const invalidAccessParams: AddRemoveAccessPermissionRequest = {
        ...mockDataSetAddAccessParams,
        dataSetId: mockInvalidId
      };
      try {
        await dataSetService.addDataSetAccessPermissions(invalidAccessParams);
      } catch (error) {
        expect(Boom.isBoom(error, 404)).toBe(true);
        expect(error.message).toBe(`Could not find DataSet '${mockInvalidId}'.`);
      }
    });
  });

  describe('getDataSetAllAccessPermissions', () => {
    it('returns permssions on a dataset.', async () => {
      await expect(
        dataSetService.getAllDataSetAccessPermissions(mockDataSetId, mockAuthenticatedUser)
      ).resolves.toMatchObject(mockAddAccessResponse);
    });
    it('throws when an invalid dataset Id is given.', async () => {
      try {
        await dataSetService.getAllDataSetAccessPermissions(mockInvalidId, mockAuthenticatedUser);
      } catch (error) {
        expect(Boom.isBoom(error, 404)).toBe(true);
        expect(error.message).toBe(`Could not find DataSet '${mockInvalidId}'.`);
      }
    });
  });

  describe('getDataSetAccessPermissions', () => {
    it('returns permsissions for the user on the dataset', async () => {
      await expect(
        dataSetService.getDataSetAccessPermissions(
          {
            dataSetId: mockDataSetId,
            identity: mockUserId,
            identityType: 'USER'
          },
          mockAuthenticatedUser
        )
      ).resolves.toMatchObject(mockAddAccessResponse);
    });
    it('throws when an invalid dataset Id is given.', async () => {
      try {
        await dataSetService.getDataSetAccessPermissions(
          {
            dataSetId: mockInvalidId,
            identity: mockUserId,
            identityType: 'USER'
          },
          mockAuthenticatedUser
        );
      } catch (error) {
        expect(Boom.isBoom(error, 404)).toBe(true);
        expect(error.message).toBe(`Could not find DataSet '${mockInvalidId}'.`);
      }
    });
  });

  describe('removeDataSetAccessPermissions', () => {
    it('returns access permissions removed from a DataSet', async () => {
      await expect(
        dataSetService.removeDataSetAccessPermissions(mockDataSetAddAccessParams)
      ).resolves.toStrictEqual(mockAddAccessResponse);
    });
    it('throws when the dataSet does not exist', async () => {
      const invalidAccessParams: AddRemoveAccessPermissionRequest = {
        ...mockDataSetAddAccessParams,
        dataSetId: mockInvalidId
      };
      try {
        await dataSetService.removeDataSetAccessPermissions(invalidAccessParams);
      } catch (error) {
        expect(Boom.isBoom(error, 404)).toBe(true);
        expect(error.message).toBe(`Could not find DataSet '${mockInvalidId}'.`);
      }
    });
  });

  describe('getExternalEndPoint', () => {
    it('gets the external endpoint', async () => {
      await expect(
        dataSetService.getExternalEndPoint(mockDataSetId, mockExistingEndpointId, mockAuthenticatedUser)
      ).resolves.toStrictEqual({
        id: mockExistingEndpointId,
        name: mockExistingEndpointName,
        dataSetId: mockDataSetId,
        dataSetName: mockDataSetName,
        path: mockDataSetPath,
        endPointUrl: mockEndPointUrl,
        endPointAlias: mockAccessPointAlias,
        allowedRoles: [mockRoleArn],
        createdAt: mockCreatedAt,
        accessLevel: mockAccessLevel
      });
    });

    it('throws EndpointNotFoundError when the endpoint does not exist', async () => {
      jest
        .spyOn(DdbDataSetMetadataPlugin.prototype, 'getDataSetEndPointDetails')
        .mockRejectedValueOnce(new EndpointNotFoundError());

      await expect(
        dataSetService.getExternalEndPoint(mockDataSetId, mockEndPointUrl, mockAuthenticatedUser)
      ).rejects.toThrow(EndpointNotFoundError);
    });
  });
});

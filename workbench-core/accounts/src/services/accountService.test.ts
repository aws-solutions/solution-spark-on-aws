/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

jest.mock('uuid', () => ({ v4: () => 'sampleAccId' }));

import { DynamoDBClient, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { resourceTypeToKey } from '@aws/workbench-core-base';
import { mockClient } from 'aws-sdk-client-mock';
import AccountService from './accountService';

describe('AccountService', () => {
  const ORIGINAL_ENV = process.env;
  let accountMetadata: { [id: string]: string } = {};
  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...ORIGINAL_ENV }; // Make a copy
    process.env.AWS_REGION = 'us-east-1';
    process.env.STACK_NAME = 'swb-swbv2-va';
    accountMetadata = {
      envMgmtRoleArn: 'sampleEnvMgmtRoleArn',
      accountHandlerRoleArn: 'sampleAccountHandlerRoleArn',
      vpcId: 'vpc-123',
      subnetId: 'subnet-123',
      encryptionKeyArn: 'sampleEncryptionKeyArn',
      environmentInstanceFiles: '',
      stackName: `${process.env.STACK_NAME!}-hosting-account`,
      status: 'CURRENT',
      resourceType: 'account'
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // Restore old environment
  });

  const accountId = `${resourceTypeToKey.account.toLowerCase()}-sampleAccId`;

  test('create follows create account path as expected', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(QueryCommand).resolves({ Count: 0 });

    accountMetadata.awsAccountId = '123456789012';
    accountMetadata.externalId = 'workbench';

    // OPERATE
    const response = await accountService.create(accountMetadata);

    // CHECK
    expect(response).toEqual({
      ...accountMetadata,
      id: accountId
    });
  });

  test('update follows update account path as expected', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(GetItemCommand).resolves({
      Item: {
        awsAccountId: { S: '123456789012' },
        targetAccountStackName: { S: 'swb-dev-va-hosting-account' },
        portfolioId: { S: 'port-1234' },
        id: { S: 'sampleAccId' },
        accountId: { S: 'sampleAccId' }
      }
    });

    accountMetadata.id = 'sampleAccId';
    accountMetadata.accountId = 'sampleAccId';
    accountMetadata.awsAccountId = '123456789012';
    accountMetadata.externalId = 'workbench';

    // OPERATE
    const response = await accountService.update(accountMetadata);

    // CHECK
    expect(response).toEqual({ ...accountMetadata, id: 'sampleAccId' });
  });

  test('update follows update account path as expected without awsAccountId or externalId', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(GetItemCommand).resolves({
      Item: {
        awsAccountId: { S: '123456789012' },
        targetAccountStackName: { S: 'swb-dev-va-hosting-account' },
        portfolioId: { S: 'port-1234' },
        id: { S: 'sampleAccId' },
        accountId: { S: 'sampleAccId' }
      }
    });

    accountMetadata.id = 'sampleAccId';
    accountMetadata.accountId = 'sampleAccId';

    // OPERATE
    const response = await accountService.update(accountMetadata);

    // CHECK
    expect(response).toEqual({ ...accountMetadata, id: 'sampleAccId' });
  });

  test('update throws error when update process finds account with different aws account id', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(GetItemCommand).resolves({
      Item: {
        awsAccountId: { S: 'someOtherAwsAccountId' },
        targetAccountStackName: { S: 'swb-dev-va-hosting-account' },
        portfolioId: { S: 'port-1234' },
        id: { S: 'sampleAccId' },
        accountId: { S: 'sampleAccId' }
      }
    });

    accountMetadata.id = 'sampleAccId';
    accountMetadata.accountId = 'sampleAccId';
    accountMetadata.awsAccountId = '123456789012';
    accountMetadata.externalId = 'workbench';

    // OPERATE & CHECK
    await expect(accountService.update(accountMetadata)).rejects.toThrow(
      'The AWS Account mapped to this accountId is different than the one provided'
    );
  });

  test('update throws error when update process cannot find account', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(GetItemCommand).resolves({});

    accountMetadata.id = 'sampleAccId';
    accountMetadata.accountId = 'sampleAccId';
    accountMetadata.awsAccountId = '123456789012';

    // OPERATE & CHECK
    await expect(accountService.update(accountMetadata)).rejects.toThrow(
      `Could not find account ${accountMetadata.accountId}`
    );
  });

  test('create throws error when create process finds a duplicate entry', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(QueryCommand).resolves({ Count: 1 });

    accountMetadata.awsAccountId = '123456789012';

    // OPERATE & CHECK
    await expect(accountService.create(accountMetadata)).rejects.toThrow(
      'This AWS Account was found in DDB. Please provide the correct id value in request body'
    );
  });

  test('create throws error when create has missing aws account ID', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    // OPERATE & CHECK
    await expect(accountService.create(accountMetadata)).rejects.toThrow(
      'Missing AWS Account ID in request body'
    );
  });

  test('create follows create account path as expected', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(QueryCommand).resolves({ Count: 0 });

    accountMetadata.awsAccountId = '123456789012';

    // OPERATE
    const response = await accountService.create(accountMetadata);

    // CHECK
    expect(response).toEqual({
      ...accountMetadata,
      id: accountId
    });
  });

  test('update follows update account path as expected when aws account not provided in metadata', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(UpdateItemCommand).resolves({});
    mockDDB.on(GetItemCommand).resolves({
      Item: {
        awsAccountId: { S: '123456789012' },
        targetAccountStackName: { S: 'swb-dev-va-hosting-account' },
        portfolioId: { S: 'port-1234' },
        id: { S: 'sampleAccId' },
        accountId: { S: 'sampleAccId' }
      }
    });

    const accountMetadata = {
      id: 'sampleAccId',
      status: 'CURRENT'
    };

    // OPERATE
    const response = await accountService.update(accountMetadata);

    // CHECK
    expect(response).toEqual({ ...accountMetadata, id: 'sampleAccId' });
  });

  test('getAccounts returns no Items attribute', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(QueryCommand).resolves({});

    // OPERATE
    const response = await accountService.getAccounts();

    // CHECK
    expect(response).toEqual([]);
  });

  test('getAccounts returns list of onboarded accounts', async () => {
    // BUILD
    const accountService = new AccountService(process.env.STACK_NAME!);
    const accounts = [
      {
        awsAccountId: { S: '123456789012' },
        targetAccountStackName: { S: 'swb-dev-va-hosting-account' },
        portfolioId: { S: 'port-1234' },
        id: { S: 'sampleAccId' },
        accountId: { S: 'sampleAccId' }
      }
    ];
    const expectedList = [
      {
        accountId: 'sampleAccId',
        awsAccountId: '123456789012',
        id: 'sampleAccId',
        portfolioId: 'port-1234',
        targetAccountStackName: 'swb-dev-va-hosting-account'
      }
    ];

    const mockDDB = mockClient(DynamoDBClient);
    mockDDB.on(QueryCommand).resolves({
      Items: accounts
    });

    // OPERATE
    const response = await accountService.getAccounts();

    // CHECK
    expect(response).toEqual(expectedList);
  });
});

/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
jest.mock('../services/environmentTypeService');

import { AwsService } from '@aws/workbench-core-base';
import { EnvironmentTypeHandler } from '..';

describe('EnvironmentTypeHandler', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV }; // Make a copy
    process.env.STACK_NAME = 'swb-swbv2-va';
    process.env.SC_PORTFOLIO_NAME = 'swb-swbv2-va';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // Restore old environment
  });

  test('Throw exception when portfolio is empty', async () => {
    // BUILD
    const awsService = new AwsService({ region: 'us-east-1' });
    awsService.helpers.serviceCatalog.getPortfolioId = jest.fn().mockResolvedValue(undefined);
    awsService.helpers.serviceCatalog.getProductsByPortfolioId = jest.fn().mockResolvedValue([]);

    const environmentTypeHandler = new EnvironmentTypeHandler(awsService);

    // OPERATE
    await expect(environmentTypeHandler.execute({})).rejects.toThrowError(
      new Error(`Could not find portfolioId for portfolio: ${process.env.SC_PORTFOLIO_NAME}`)
    );
  });

  test('Throw exception when save EnvType parameters are empty', async () => {
    // BUILD
    const awsService = new AwsService({ region: 'us-east-1' });
    awsService.helpers.serviceCatalog.getPortfolioId = jest.fn().mockResolvedValue('portfolioTest');
    awsService.helpers.serviceCatalog.getProductsByPortfolioId = jest
      .fn()
      .mockResolvedValue([{ ProductId: '' }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactsByProductId = jest
      .fn()
      .mockResolvedValue([{ Id: '', Active: true }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactDetails = jest
      .fn()
      .mockResolvedValue({ Info: { TemplateUrl: 'www.test.com' } });
    awsService.helpers.s3.getTemplateByURL = jest.fn().mockResolvedValue({});

    const environmentTypeHandler = new EnvironmentTypeHandler(awsService);

    environmentTypeHandler['_getExistingEnvironmentType'] = jest.fn().mockResolvedValue(undefined);

    const saveMethod = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(EnvironmentTypeHandler.prototype as any, '_saveEnvironmentType');

    // OPERATE
    await expect(environmentTypeHandler.execute({})).resolves.not.toThrowError();

    //CHECK
    await expect(saveMethod).rejects.toThrow(
      new Error(
        `An error ocurred while saving an Environment Type, Product and Artifact Must not be empty, { Product: '', Provision Artifact: ''}`
      )
    );
  });

  test('Save new Environment type when there is a new provision artifact ', async () => {
    // BUILD
    const awsService = new AwsService({ region: 'us-east-1' });
    awsService.helpers.serviceCatalog.getPortfolioId = jest.fn().mockResolvedValue('portfolioTest');
    awsService.helpers.serviceCatalog.getProductsByPortfolioId = jest
      .fn()
      .mockResolvedValue([{ ProductId: 'prod' }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactsByProductId = jest
      .fn()
      .mockResolvedValue([{ Id: 'pa', Active: true }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactDetails = jest
      .fn()
      .mockResolvedValue({ Info: { TemplateUrl: 'www.test.com' } });
    awsService.helpers.s3.getTemplateByURL = jest.fn().mockResolvedValue({});

    const environmentTypeHandler = new EnvironmentTypeHandler(awsService);

    environmentTypeHandler['_getExistingEnvironmentType'] = jest.fn().mockResolvedValueOnce(undefined);

    const saveMethod = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(EnvironmentTypeHandler.prototype as any, '_saveEnvironmentType')
      .mockResolvedValueOnce(() => {});

    // OPERATE
    await expect(environmentTypeHandler.execute({})).resolves.not.toThrowError();

    // CHECK
    expect(saveMethod).toBeCalledTimes(1);
  });

  test('Do not save Environment Type when there is not a new provision artifact', async () => {
    // BUILD
    const awsService = new AwsService({ region: 'us-east-1' });
    awsService.helpers.serviceCatalog.getPortfolioId = jest.fn().mockResolvedValue('portfolioTest');
    awsService.helpers.serviceCatalog.getProductsByPortfolioId = jest
      .fn()
      .mockResolvedValue([{ ProductId: 'prod' }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactsByProductId = jest
      .fn()
      .mockResolvedValue([{ Id: 'pa', Active: true }]);
    awsService.helpers.serviceCatalog.getProvisionArtifactDetails = jest
      .fn()
      .mockResolvedValue({ Info: { TemplateUrl: 'www.test.com' } });
    awsService.helpers.s3.getTemplateByURL = jest.fn().mockResolvedValue({});

    const environmentTypeHandler = new EnvironmentTypeHandler(awsService);

    environmentTypeHandler['_getExistingEnvironmentType'] = jest.fn().mockResolvedValue({
      id: 'test',
      productId: 'test',
      provisioningArtifactId: 'test'
    });
    const saveMethod = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(EnvironmentTypeHandler.prototype as any, '_saveEnvironmentType')
      .mockResolvedValueOnce(() => {});

    // OPERATE
    await expect(environmentTypeHandler.execute({})).resolves.not.toThrowError();

    // CHECK
    expect(saveMethod).not.toBeCalled();
  });
});

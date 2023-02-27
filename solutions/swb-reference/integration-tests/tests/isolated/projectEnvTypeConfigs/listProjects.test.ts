/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import ClientSession from '../../../support/clientSession';
import Setup from '../../../support/setup';
import HttpError from '../../../support/utils/HttpError';
import { checkHttpError } from '../../../support/utils/utilities';

describe('list projects associated to environment type config', () => {
  const setup: Setup = Setup.getSetup();
  let adminSession: ClientSession;
  const envTypeId = setup.getSettings().get('envTypeId');
  const envTypeConfigId = setup.getSettings().get('envTypeConfigId');
  const nonExistentEnvTypeId = 'et-prod-0123456789012,pa-0123456789012';
  const nonExistentEnvTypeConfigId = 'etc-12345678-1234-1234-1234-123456789012';

  beforeEach(() => {
    expect.hasAssertions();
  });

  beforeAll(async () => {
    adminSession = await setup.getDefaultAdminSession();
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  test('list envTypeConfigProjects executes successfully', async () => {
    const { data: response } = await adminSession.resources.environmentTypes
      .environmentType(envTypeId)
      .configurations()
      .environmentTypeConfig(envTypeConfigId)
      .projects()
      .get({});
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('list envTypeConfigProjects fails when using invalid format environment type config Id', async () => {
    try {
      await adminSession.resources.environmentTypes
        .environmentType(envTypeId)
        .configurations()
        .environmentTypeConfig('invalid-config-id')
        .projects()
        .get({});
    } catch (e) {
      checkHttpError(
        e,
        new HttpError(404, {
          error: 'Not Found',
          message: `Could not find environment type config invalid-config-id`
        })
      );
    }
  });

  test('list envTypeConfigProjects fails when using non existing environment type config Id', async () => {
    try {
      await adminSession.resources.environmentTypes
        .environmentType(envTypeId)
        .configurations()
        .environmentTypeConfig(nonExistentEnvTypeConfigId)
        .projects()
        .get({});
    } catch (e) {
      checkHttpError(
        e,
        new HttpError(404, {
          error: 'Not Found',
          message: `Could not find environment type config ${nonExistentEnvTypeConfigId}`
        })
      );
    }
  });

  test('list projectEnvTypeConfigs fails when using invalid format envType Id', async () => {
    try {
      await adminSession.resources.environmentTypes
        .environmentType('invalid-env-type-id')
        .configurations()
        .environmentTypeConfig(envTypeConfigId)
        .projects()
        .get({});
    } catch (e) {
      checkHttpError(
        e,
        new HttpError(404, {
          error: 'Not Found',
          message: `Could not find environment type config ${envTypeConfigId}`
        })
      );
    }
  });

  test('list projectEnvTypeConfigs fails when using non existing envType Id', async () => {
    try {
      await adminSession.resources.environmentTypes
        .environmentType(nonExistentEnvTypeId)
        .configurations()
        .environmentTypeConfig(envTypeConfigId)
        .projects()
        .get({});
    } catch (e) {
      checkHttpError(
        e,
        new HttpError(404, {
          error: 'Not Found',
          message: `Could not find environment type config ${envTypeConfigId}`
        })
      );
    }
  });
});

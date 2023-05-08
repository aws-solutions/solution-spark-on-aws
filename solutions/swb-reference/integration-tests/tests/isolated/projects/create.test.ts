/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import ClientSession from '../../../support/clientSession';
import Setup from '../../../support/setup';
import HttpError from '../../../support/utils/HttpError';
import RandomTextGenerator from '../../../support/utils/randomTextGenerator';
import {
  checkHttpError,
  generateRandomString,
  validSwbName,
  validSwbDescription
} from '../../../support/utils/utilities';

interface CreateRequest {
  name?: string;
  description?: string;
  costCenterId?: string;
}

describe('Create Project negative tests', () => {
  const setup: Setup = Setup.getSetup();
  let adminSession: ClientSession;
  let costCenterId: string;
  let existingProjectName: string;
  const randomTextGenerator = new RandomTextGenerator(setup.getSettings().get('runId'));
  let createRequest: CreateRequest;

  beforeAll(async () => {
    adminSession = await setup.getDefaultAdminSession();
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  beforeEach(async () => {
    expect.hasAssertions();

    const { data: costCenter } = await adminSession.resources.costCenters.create({
      name: generateRandomString(10, validSwbName),
      accountId: setup.getSettings().get('defaultHostingAccountId'),
      description: generateRandomString(10, validSwbDescription)
    });
    costCenterId = costCenter.id;

    createRequest = {
      name: 'validName',
      description: 'valid description',
      costCenterId
    };
  });

  describe('with a name', () => {
    describe('that belongs to an existing project', () => {
      beforeEach(async () => {
        existingProjectName = generateRandomString(10, validSwbName);
        await adminSession.resources.projects.create({
          name: existingProjectName,
          description: 'Create Project negative tests--Project for TOP SECRET dragon research',
          costCenterId
        });
        createRequest.name = existingProjectName;
      });

      test('it throws 400 error', async () => {
        try {
          await adminSession.resources.projects.create(createRequest);
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: `Project name "${existingProjectName}" is in use by a non deleted project. Please use another name.`
            })
          );
        }
      });
    });

    describe('that is missing', () => {
      beforeEach(async () => {
        delete createRequest.name;
      });

      test('it throws 400 error', async () => {
        try {
          await adminSession.resources.projects.create(createRequest);
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: 'name: Required'
            })
          );
        }
      });
    });
  });

  describe('with a description', () => {
    describe('that is missing', () => {
      beforeEach(async () => {
        delete createRequest.description;
      });

      test('it throws 400 error', async () => {
        try {
          await adminSession.resources.projects.create(createRequest);
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: 'description: Required'
            })
          );
        }
      });
    });
  });

  describe('with a cost center', () => {
    describe('that does not exist', () => {
      beforeEach(async () => {
        createRequest.costCenterId = 'cc-1234abcd-1234-abcd-1234-abcd1234abcd';
      });

      test('it throws 400 error', async () => {
        try {
          await adminSession.resources.projects.create(createRequest);
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: `Could not find cost center cc-1234abcd-1234-abcd-1234-abcd1234abcd`
            })
          );
        }
      });
    });

    describe('that is missing', () => {
      beforeEach(async () => {
        delete createRequest.costCenterId;
      });

      test('it throws 400 error', async () => {
        try {
          await adminSession.resources.projects.create(createRequest);
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: 'costCenterId: Required'
            })
          );
        }
      });
    });

    describe('that was deleted', () => {
      beforeEach(async () => {
        const { data: costCenter } = await adminSession.resources.costCenters.create({
          name: generateRandomString(10, validSwbName),
          accountId: setup.getSettings().get('defaultHostingAccountId'),
          description: generateRandomString(10, validSwbDescription)
        });
        costCenterId = costCenter.id;

        await adminSession.resources.costCenters.costCenter(costCenterId).delete();
      });

      test('it throws 400 error', async () => {
        try {
          existingProjectName = randomTextGenerator.getFakeText('test-project-name');
          await adminSession.resources.projects.create({
            name: existingProjectName,
            description: 'Project for TOP SECRET dragon research',
            costCenterId
          });
        } catch (e) {
          checkHttpError(
            e,
            new HttpError(400, {
              error: 'Bad Request',
              message: `Cost center ${costCenterId} was deleted`
            })
          );
        }
      });
    });
  });
});

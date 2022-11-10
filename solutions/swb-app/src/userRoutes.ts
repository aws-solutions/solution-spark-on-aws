/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// User management
import {
  CreateRoleSchema,
  CreateUserSchema,
  UpdateUserSchema,
  Status,
  UpdateRoleSchema,
  UserManagementService,
  isUserNotFoundError,
  isRoleNotFoundError,
  isInvalidParameterError
} from '@aws/workbench-core-authentication';
import Boom from '@hapi/boom';
import { Request, Response, Router } from 'express';
import { validate } from 'jsonschema';
import _ from 'lodash';
import { wrapAsync } from './errorHandlers';
import { processValidatorResult } from './validatorHelper';

export function setUpUserRoutes(router: Router, user: UserManagementService): void {
  router.post(
    '/users',
    wrapAsync(async (req: Request, res: Response) => {
      processValidatorResult(validate(req.body, CreateUserSchema));
      const response = await user.createUser(req.body);
      res.status(201).send(response);
    })
  );

  router.get(
    '/users',
    wrapAsync(async (req: Request, res: Response) => {
      const users = await user.listUsers();
      res.status(200).json({ users });
    })
  );

  router.delete(
    '/users/:userId',
    wrapAsync(async (req: Request, res: Response) => {
      const userId = req.params.userId;
      try {
        const existingUser = await user.getUser(userId);
        if (existingUser.status !== Status.INACTIVE) {
          throw Boom.badRequest(
            `Could not delete user ${userId}. Expected status: ${Status[Status.INACTIVE]}; received: ${
              Status[existingUser.status]
            }`
          );
        }

        await user.deleteUser(userId);
        res.status(204).send();
      } catch (err) {
        if (isUserNotFoundError(err)) throw Boom.notFound(`Could not find user ${userId}`);
        if (Boom.isBoom(err)) throw err;
        throw Boom.badImplementation(`Could not delete user ${userId}`);
      }
    })
  );

  router.patch(
    '/users/:userId',
    wrapAsync(async (req: Request, res: Response) => {
      processValidatorResult(validate(req.body, UpdateUserSchema));
      const userId = req.params.userId;
      try {
        const existingUser = await user.getUser(userId);

        if (!_.isUndefined(req.body.status)) {
          if (req.body.status === 'ACTIVE' && existingUser.status === Status.INACTIVE)
            await user.activateUser(userId);
          if (req.body.status === 'INACTIVE' && existingUser.status === Status.ACTIVE)
            await user.deactivateUser(userId);
          delete req.body.status; // Status update is complete, and type is different than expected for further steps
        }

        if (!_.isEmpty(req.body.roles) && !_.isEqual(existingUser.roles, req.body.roles)) {
          const rolesToAdd = _.difference(req.body.roles, existingUser.roles);
          await Promise.all(
            _.map(rolesToAdd, async (role) => {
              await user.addUserToRole(userId, role);
            })
          );
          const rolesToRemove = _.difference(existingUser.roles, req.body.roles);
          await Promise.all(
            _.map(rolesToRemove, async (role) => {
              await user.removeUserFromRole(userId, role);
            })
          );
        }

        // Since updateUser() requires object of type User
        await user.updateUser(userId, { ...existingUser, ...req.body });
        res.status(204).send();
      } catch (err) {
        if (isUserNotFoundError(err)) throw Boom.notFound(`Could not find user ${userId}`);
        if (isRoleNotFoundError(err))
          throw Boom.notFound(
            'Please make sure all specified roles exist as groups in the Cognito User Pool'
          );
        if (isInvalidParameterError(err))
          throw Boom.notFound(
            'Please make sure specified email is in valid email format and not already in use in the Cognito User Pool'
          );
        if (Boom.isBoom(err)) throw err;
        throw Boom.badImplementation(`Could not update user ${userId}`);
      }
    })
  );

  router.post(
    '/roles',
    wrapAsync(async (req: Request, res: Response) => {
      processValidatorResult(validate(req.body, CreateRoleSchema));
      const response = await user.createRole(req.body.roleName);
      res.status(201).send(response);
    })
  );

  router.put(
    '/roles/:roleName',
    wrapAsync(async (req: Request, res: Response) => {
      processValidatorResult(validate(req.body, UpdateRoleSchema));
      if (!_.isString(req.params.roleName)) {
        throw Boom.badRequest('roleName must be a string.');
      }
      const response = await user.addUserToRole(req.body.username, req.params.roleName);
      res.send(response);
    })
  );
}

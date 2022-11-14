/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  DeleteGroupCommand,
  GroupExistsException,
  InternalErrorException,
  InvalidParameterException,
  ListGroupsCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
  NotAuthorizedException,
  ResourceNotFoundException,
  UsernameExistsException,
  UserNotFoundException
} from '@aws-sdk/client-cognito-identity-provider';
import { AwsService } from '@aws/workbench-core-base';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoUserManagementPlugin,
  IdpUnavailableError,
  InvalidParameterError,
  PluginConfigurationError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
  User,
  UserAlreadyExistsError,
  UserNotFoundError
} from '..';
import { Status } from '../user';

const userInfo: Omit<User, 'roles'> = {
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'Sample-email-address',
  status: Status.ACTIVE
} as const;

const region: string = 'us-east-1';
const awsCreds = {
  accessKeyId: 'fakeKey',
  secretAccessKey: 'fakeSecret'
} as const;

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('CognitoUserManagementPlugin tests', () => {
  let aws: AwsService;
  let plugin: CognitoUserManagementPlugin;
  let roles: string[];

  beforeEach(() => {
    cognitoMock.reset();
    aws = new AwsService({
      region,
      credentials: awsCreds
    });
    plugin = new CognitoUserManagementPlugin('us-west-2_fakeId', aws);
    roles = ['Role1', 'Role2'];
  });

  describe('getUser tests', () => {
    it('should return the requested User when it exists', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: true
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        roles
      });
    });

    it('should return an empty string for the Users first name when it is not set', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: true
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        firstName: '',
        roles
      });
    });

    it('should return an empty string for the Users last name when it is not set', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: true
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        lastName: '',
        roles
      });
    });

    it('should return an empty string for the Users email when it is not set', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName }
        ],
        Enabled: true
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        status: Status.INACTIVE,
        roles
      });
    });

    it('should return an empty array for the Users roles when no roles are assigned to it', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: false
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        status: Status.INACTIVE,
        roles
      });
    });

    it('should return Status.INACTIVE for the Users status when it is not set', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ]
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        status: Status.INACTIVE,
        roles
      });
    });

    it('should return an empty array for the Users roles when no roles are assigned to it', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: true
      });
      cognitoMock.on(AdminListGroupsForUserCommand).resolves({});

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        roles: []
      });
    });

    it('should return an empty string for the Users first name, last name, and email when the user doesnt have an attributes field', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({ Enabled: true });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        firstName: '',
        lastName: '',
        email: '',
        roles
      });
    });

    it('should return an empty array for the Users roles when the groups dont have names', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'given_name', Value: userInfo.firstName },
          { Name: 'family_name', Value: userInfo.lastName },
          { Name: 'email', Value: userInfo.email }
        ],
        Enabled: true
      });
      cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: roles.map(() => ({})) });

      const user = await plugin.getUser(userInfo.id);

      expect(user).toMatchObject<User>({
        ...userInfo,
        roles: []
      });
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.getUser(userInfo.id)).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.getUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.getUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw UserNotFoundError when the user doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.getUser(userInfo.id)).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new Error());

      await expect(plugin.getUser(userInfo.id)).rejects.toThrow(Error);
    });
  });

  describe('createUser tests', () => {
    it('should return the requested User when all params are valid', async () => {
      cognitoMock.on(AdminCreateUserCommand).resolves({
        User: {
          Username: userInfo.id,
          Attributes: [
            { Name: 'given_name', Value: userInfo.firstName },
            { Name: 'family_name', Value: userInfo.lastName },
            { Name: 'email', Value: userInfo.email }
          ],
          Enabled: true
        }
      });

      const user = await plugin.createUser(userInfo);

      expect(user).toMatchObject({ ...userInfo, roles: [] });
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.createUser(userInfo)).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.createUser(userInfo)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.createUser(userInfo)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw UserAlreadyExistsError when a user with the user id already exists', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new UsernameExistsException({ $metadata: {} }));

      await expect(plugin.createUser(userInfo)).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should throw UserAlreadyExistsError when a user with the email already exists', async () => {
      cognitoMock
        .on(AdminCreateUserCommand)
        .rejects({ name: 'UsernameExistsException', message: 'An account with the email already exists.' });

      await expect(plugin.createUser(userInfo)).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should throw InvalidParameterError the email provided is not in the proper format', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new InvalidParameterException({ $metadata: {} }));

      await expect(plugin.createUser(userInfo)).rejects.toThrow(InvalidParameterError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new Error());

      await expect(plugin.createUser(userInfo)).rejects.toThrow(Error);
    });
  });

  describe('updateUser tests', () => {
    it('should update the requested User when all params are valid', async () => {
      const updateMock = cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});

      await plugin.updateUser(userInfo.id, { ...userInfo, roles });

      expect(updateMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(
        IdpUnavailableError
      );
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(
        PluginConfigurationError
      );
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock
        .on(AdminUpdateUserAttributesCommand)
        .rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(
        PluginConfigurationError
      );
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(UserNotFoundError);
    });

    it('should throw InvalidParameterError the email provided is not in the proper format', async () => {
      cognitoMock
        .on(AdminUpdateUserAttributesCommand)
        .rejects(new InvalidParameterException({ $metadata: {} }));

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(
        InvalidParameterError
      );
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).rejects(new Error());

      await expect(plugin.updateUser(userInfo.id, { ...userInfo, roles })).rejects.toThrow(Error);
    });
  });

  describe('deleteUser tests', () => {
    it('should delete the requested User when the user id exists', async () => {
      const deleteMock = cognitoMock.on(AdminDeleteUserCommand).resolves({});

      await plugin.deleteUser(userInfo.id);

      expect(deleteMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminDeleteUserCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.deleteUser(userInfo.id)).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminDeleteUserCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.deleteUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminDeleteUserCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.deleteUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminDeleteUserCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.deleteUser(userInfo.id)).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminDeleteUserCommand).rejects(new Error());

      await expect(plugin.deleteUser(userInfo.id)).rejects.toThrow(Error);
    });
  });

  describe('activateUser tests', () => {
    it('should activate the requested User when the user id exists', async () => {
      const deleteMock = cognitoMock.on(AdminEnableUserCommand).resolves({});

      await plugin.activateUser(userInfo.id);

      expect(deleteMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminEnableUserCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.activateUser(userInfo.id)).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminEnableUserCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.activateUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminEnableUserCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.activateUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminEnableUserCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.activateUser(userInfo.id)).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminEnableUserCommand).rejects(new Error());

      await expect(plugin.activateUser(userInfo.id)).rejects.toThrow(Error);
    });
  });

  describe('deactivateUser tests', () => {
    it('should delete the requested User when the user id exists', async () => {
      const deleteMock = cognitoMock.on(AdminDisableUserCommand).resolves({});

      await plugin.deactivateUser(userInfo.id);

      expect(deleteMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminDisableUserCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.deactivateUser(userInfo.id)).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminDisableUserCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.deactivateUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminDisableUserCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.deactivateUser(userInfo.id)).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminDisableUserCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.deactivateUser(userInfo.id)).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminDisableUserCommand).rejects(new Error());

      await expect(plugin.deactivateUser(userInfo.id)).rejects.toThrow(Error);
    });
  });

  describe('listUsers tests', () => {
    it('should return a list of Users in the user pool', async () => {
      cognitoMock.on(ListUsersCommand).resolves({
        Users: [
          {
            Username: userInfo.id,
            Attributes: [
              { Name: 'given_name', Value: userInfo.firstName },
              { Name: 'family_name', Value: userInfo.lastName },
              { Name: 'email', Value: userInfo.email }
            ],
            Enabled: true
          }
        ]
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const users = await plugin.listUsers();

      expect(users.length).toBe(1);
      expect(users).toMatchObject([{ ...userInfo, roles }]);
    });

    it('should return an empty array for user.role for users with no groups', async () => {
      cognitoMock.on(ListUsersCommand).resolves({
        Users: [
          {
            Username: userInfo.id,
            Attributes: [
              { Name: 'given_name', Value: userInfo.firstName },
              { Name: 'family_name', Value: userInfo.lastName },
              { Name: 'email', Value: userInfo.email }
            ],
            Enabled: true
          }
        ]
      });
      cognitoMock.on(AdminListGroupsForUserCommand).resolves({});

      const users = await plugin.listUsers();

      expect(users.length).toBe(1);
      expect(users).toMatchObject([{ ...userInfo, roles: [] }]);
    });

    it('should return an empty array when no users are in the user pool', async () => {
      cognitoMock.on(ListUsersCommand).resolves({});

      const users = await plugin.listUsers();

      expect(users.length).toBe(0);
      expect(users).toMatchObject<string[]>([]);
    });

    it('should return an empty array when the users dont have user ids', async () => {
      cognitoMock.on(ListUsersCommand).resolves({
        Users: [
          {
            Attributes: [
              { Name: 'given_name', Value: userInfo.firstName },
              { Name: 'family_name', Value: userInfo.lastName },
              { Name: 'email', Value: userInfo.email }
            ]
          }
        ]
      });
      cognitoMock
        .on(AdminListGroupsForUserCommand)
        .resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const users = await plugin.listUsers();

      expect(users.length).toBe(0);
      expect(users).toMatchObject([]);
    });

    it('should populate missing values with empty strings', async () => {
      cognitoMock.on(ListUsersCommand).resolves({ Users: [{ Username: userInfo.id }] });
      cognitoMock.on(AdminListGroupsForUserCommand).resolves({ Groups: roles.map(() => ({})) });

      const users = await plugin.listUsers();

      expect(users.length).toBe(1);
      expect(users).toMatchObject<User[]>([
        { id: userInfo.id, firstName: '', lastName: '', email: '', status: Status.INACTIVE, roles: [] }
      ]);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(ListUsersCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.listUsers()).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(ListUsersCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.listUsers()).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(ListUsersCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.listUsers()).rejects.toThrow(PluginConfigurationError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(ListUsersCommand).rejects(new Error());

      await expect(plugin.listUsers()).rejects.toThrow(Error);
    });
  });

  describe('listUsersForRole tests', () => {
    it('should return a list of Users in the given group', async () => {
      cognitoMock.on(ListUsersInGroupCommand).resolves({ Users: [{ Username: userInfo.id }] });

      const users = await plugin.listUsersForRole(roles[0]);

      expect(users.length).toBe(1);
      expect(users).toMatchObject<string[]>([userInfo.id]);
    });

    it('should return an empty array when no users are in group', async () => {
      cognitoMock.on(ListUsersInGroupCommand).resolves({});

      const users = await plugin.listUsersForRole(roles[0]);

      expect(users.length).toBe(0);
      expect(users).toMatchObject<string[]>([]);
    });

    it('should return an empty array when the users dont have user ids', async () => {
      cognitoMock.on(ListUsersInGroupCommand).resolves({ Users: [{}] });

      const users = await plugin.listUsersForRole(roles[0]);

      expect(users.length).toBe(0);
      expect(users).toMatchObject<string[]>([]);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(ListUsersInGroupCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.listUsersForRole(roles[0])).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(ListUsersInGroupCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.listUsersForRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(ListUsersInGroupCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.listUsersForRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw RoleNotFoundError when the group doesnt exist in the user pool', async () => {
      cognitoMock
        .on(ListUsersInGroupCommand)
        .rejects({ name: 'ResourceNotFoundException', message: 'Group not found.' });

      await expect(plugin.listUsersForRole(roles[0])).rejects.toThrow(RoleNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(ListUsersInGroupCommand).rejects(new Error());

      await expect(plugin.listUsersForRole(roles[0])).rejects.toThrow(Error);
    });
  });

  describe('listRoles tests', () => {
    it('should return a list of roles in the user pool', async () => {
      cognitoMock.on(ListGroupsCommand).resolves({ Groups: roles.map((role) => ({ GroupName: role })) });

      const groups = await plugin.listRoles();

      expect(groups.length).toBe(roles.length);
      expect(groups).toMatchObject<string[]>(roles);
    });

    it('should return an empty array when no groups are in the user pool', async () => {
      cognitoMock.on(ListGroupsCommand).resolves({});

      const groups = await plugin.listRoles();

      expect(groups.length).toBe(0);
      expect(groups).toMatchObject<string[]>([]);
    });

    it('should return an empty array when the groups dont have names', async () => {
      cognitoMock.on(ListGroupsCommand).resolves({ Groups: [{}] });

      const groups = await plugin.listRoles();

      expect(groups.length).toBe(0);
      expect(groups).toMatchObject<string[]>([]);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(ListGroupsCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.listRoles()).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(ListGroupsCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.listRoles()).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(ListGroupsCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.listRoles()).rejects.toThrow(PluginConfigurationError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(ListGroupsCommand).rejects(new Error());

      await expect(plugin.listRoles()).rejects.toThrow(Error);
    });
  });

  describe('addUserToRole tests', () => {
    it('should add the requested User to the group when the user id and group both exist', async () => {
      const addUserToRoleMock = cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

      await plugin.addUserToRole(userInfo.id, roles[0]);

      expect(addUserToRoleMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw RoleNotFoundError when the group doesnt exist in the user pool', async () => {
      cognitoMock
        .on(AdminAddUserToGroupCommand)
        .rejects({ name: 'ResourceNotFoundException', message: 'Group not found.' });

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(RoleNotFoundError);
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).rejects(new Error());

      await expect(plugin.addUserToRole(userInfo.id, roles[0])).rejects.toThrow(Error);
    });
  });

  describe('removeUserFromRole tests', () => {
    it('should remove the requested User from the group when the user id and group both exist', async () => {
      const removeUserFromRoleMock = cognitoMock.on(AdminRemoveUserFromGroupCommand).resolves({});

      await plugin.removeUserFromRole(userInfo.id, roles[0]);

      expect(removeUserFromRoleMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(AdminRemoveUserFromGroupCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(AdminRemoveUserFromGroupCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(
        PluginConfigurationError
      );
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock
        .on(AdminRemoveUserFromGroupCommand)
        .rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(
        PluginConfigurationError
      );
    });

    it('should throw RoleNotFoundError when the group doesnt exist in the user pool', async () => {
      cognitoMock
        .on(AdminRemoveUserFromGroupCommand)
        .rejects({ name: 'ResourceNotFoundException', message: 'Group not found.' });

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(RoleNotFoundError);
    });

    it('should throw UserNotFoundError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(AdminRemoveUserFromGroupCommand).rejects(new UserNotFoundException({ $metadata: {} }));

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(UserNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(AdminRemoveUserFromGroupCommand).rejects(new Error());

      await expect(plugin.removeUserFromRole(userInfo.id, roles[0])).rejects.toThrow(Error);
    });
  });

  describe('createRole tests', () => {
    it('should create the requested group when the group doesnt already exist', async () => {
      const createGroupMock = cognitoMock.on(CreateGroupCommand).resolves({});

      await plugin.createRole(roles[0]);

      expect(createGroupMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(CreateGroupCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.createRole(roles[0])).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(CreateGroupCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.createRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(CreateGroupCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.createRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw RoleAlreadyExistsError when the user id doesnt exist in the user pool', async () => {
      cognitoMock.on(CreateGroupCommand).rejects(new GroupExistsException({ $metadata: {} }));

      await expect(plugin.createRole(roles[0])).rejects.toThrow(RoleAlreadyExistsError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(CreateGroupCommand).rejects(new Error());

      await expect(plugin.createRole(roles[0])).rejects.toThrow(Error);
    });
  });

  describe('deleteRole tests', () => {
    it('should delete the requested group when the group exists', async () => {
      const deleteGroupMock = cognitoMock.on(DeleteGroupCommand).resolves({});

      await plugin.deleteRole(roles[0]);

      expect(deleteGroupMock.calls().length).toBe(1);
    });

    it('should throw IdpUnavailableError when Cognito is unavailable', async () => {
      cognitoMock.on(DeleteGroupCommand).rejects(new InternalErrorException({ $metadata: {} }));

      await expect(plugin.deleteRole(roles[0])).rejects.toThrow(IdpUnavailableError);
    });

    it('should throw PluginConfigurationError when the plugin is not authorized to perform the action', async () => {
      cognitoMock.on(DeleteGroupCommand).rejects(new NotAuthorizedException({ $metadata: {} }));

      await expect(plugin.deleteRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw PluginConfigurationError when the user pool id is invalid', async () => {
      cognitoMock.on(DeleteGroupCommand).rejects(new ResourceNotFoundException({ $metadata: {} }));

      await expect(plugin.deleteRole(roles[0])).rejects.toThrow(PluginConfigurationError);
    });

    it('should throw RoleNotFoundError when the group doesnt exist in the user pool', async () => {
      cognitoMock
        .on(DeleteGroupCommand)
        .rejects({ name: 'ResourceNotFoundException', message: 'Group not found.' });

      await expect(plugin.deleteRole(roles[0])).rejects.toThrow(RoleNotFoundError);
    });

    it('should rethrow an error when the error is unexpected', async () => {
      cognitoMock.on(DeleteGroupCommand).rejects(new Error());

      await expect(plugin.deleteRole(roles[0])).rejects.toThrow(Error);
    });
  });
});

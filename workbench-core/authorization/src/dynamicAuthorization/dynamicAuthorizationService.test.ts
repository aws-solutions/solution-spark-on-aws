/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { AuditPlugin, AuditService, BaseAuditPlugin, Writer } from '@aws/workbench-core-audit';
import { JSONValue } from '@aws/workbench-core-base';
import { Action } from '../action';
import { AuthenticatedUser } from '../authenticatedUser';
import { Effect } from '../effect';
import { GroupNotFoundError } from '../errors/groupNotFoundError';
import { ThroughputExceededError } from '../errors/throughputExceededError';
import { CreateGroupResponse } from './dynamicAuthorizationInputs/createGroup';
import { GetUserGroupsResponse } from './dynamicAuthorizationInputs/getUserGroups';
import { IdentityPermission, IdentityType } from './dynamicAuthorizationInputs/identityPermission';
import { DynamicAuthorizationPermissionsPlugin } from './dynamicAuthorizationPermissionsPlugin';
import { DynamicAuthorizationService } from './dynamicAuthorizationService';
import { GroupManagementPlugin } from './groupManagementPlugin';
import { GroupStatus } from './models/GroupMetadata';

describe('DynamicAuthorizationService', () => {
  let auditService: AuditService;
  let auditPlugin: AuditPlugin;
  let mockAuditWriter: Writer;
  let mockUser: AuthenticatedUser;
  let mockGroupManagementPlugin: GroupManagementPlugin;
  let mockDynamicAuthorizationPermissionsPlugin: DynamicAuthorizationPermissionsPlugin;
  let dynamicAuthzService: DynamicAuthorizationService;

  beforeAll(() => {
    mockGroupManagementPlugin = {
      createGroup: jest.fn(),
      deleteGroup: jest.fn(),
      getUserGroups: jest.fn(),
      getGroupUsers: jest.fn(),
      addUserToGroup: jest.fn(),
      isUserAssignedToGroup: jest.fn(),
      removeUserFromGroup: jest.fn(),
      getGroupStatus: jest.fn(),
      setGroupStatus: jest.fn()
    };

    mockDynamicAuthorizationPermissionsPlugin = {
      isRouteIgnored: jest.fn(),
      isRouteProtected: jest.fn(),
      getDynamicOperationsByRoute: jest.fn(),
      createIdentityPermissions: jest.fn(),
      deleteIdentityPermissions: jest.fn(),
      getIdentityPermissionsByIdentity: jest.fn(),
      getIdentityPermissionsBySubject: jest.fn()
    };
    mockAuditWriter = {
      write: jest.fn()
    };
    auditPlugin = new BaseAuditPlugin(mockAuditWriter);

    auditService = new AuditService(auditPlugin);
  });

  beforeEach(() => {
    mockUser = {
      id: 'sampleId',
      roles: []
    };

    dynamicAuthzService = new DynamicAuthorizationService({
      groupManagementPlugin: mockGroupManagementPlugin,
      dynamicAuthorizationPermissionsPlugin: mockDynamicAuthorizationPermissionsPlugin,
      auditService
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createGroup', () => {
    let groupId: string;
    let status: GroupStatus;

    beforeEach(() => {
      groupId = 'groupId';
      status = 'active';
    });

    it('returns the groupID in the data object when the group was successfully created', async () => {
      mockGroupManagementPlugin.createGroup = jest.fn().mockResolvedValue({ data: { groupId } });
      mockGroupManagementPlugin.setGroupStatus = jest.fn().mockResolvedValue({ data: { status } });

      const response = await dynamicAuthzService.createGroup({ groupId, authenticatedUser: mockUser });

      expect(response).toMatchObject<CreateGroupResponse>({ data: { groupId } });
    });

    it('throws when the group is not successfully created', async () => {
      mockGroupManagementPlugin.createGroup = jest.fn().mockRejectedValue(new Error());

      await expect(dynamicAuthzService.createGroup({ groupId, authenticatedUser: mockUser })).rejects.toThrow(
        Error
      );
    });

    it('throws when the group status is not successfully set', async () => {
      mockGroupManagementPlugin.setGroupStatus = jest.fn().mockRejectedValue(new Error());

      await expect(dynamicAuthzService.createGroup({ groupId, authenticatedUser: mockUser })).rejects.toThrow(
        Error
      );
    });
  });

  describe('createIdentityPermissions', () => {
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

    let mockIdentityPermissions: IdentityPermission[];

    let actor: object;
    let source: object;
    let action: string;
    let auditServiceWriteSpy: jest.SpyInstance;
    beforeAll(() => {
      auditServiceWriteSpy = jest.spyOn(auditService, 'write');
    });

    beforeEach(() => {
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

      mockIdentityPermissions = [mockIdentityPermission, mockIdentityPermission];

      action = 'createIdentityPermissions';
      actor = mockUser;
      source = {
        serviceName: 'DynamicAuthorizationService'
      };
    });

    test('create identity permissions for valid groups', async () => {
      mockGroupManagementPlugin.getGroupStatus = jest.fn().mockResolvedValue({ data: { status: 'active' } });
      const mockReturnValue = {
        data: {
          identityPermissions: mockIdentityPermissions
        }
      };
      mockDynamicAuthorizationPermissionsPlugin.createIdentityPermissions = jest
        .fn()
        .mockResolvedValue(mockReturnValue);
      const params = {
        authenticatedUser: mockUser,
        identityPermissions: mockIdentityPermissions
      };
      const result = await dynamicAuthzService.createIdentityPermissions(params);

      expect(result.data).toStrictEqual({
        identityPermissions: mockIdentityPermissions
      });

      expect(auditServiceWriteSpy).toHaveBeenCalledWith(
        {
          actor,
          source,
          action,
          requestBody: params,
          statusCode: 200
        },
        mockReturnValue
      );
    });

    test('create identity permissions for invalid group', async () => {
      mockGroupManagementPlugin.getGroupStatus = jest
        .fn()
        .mockResolvedValueOnce({ data: { status: 'active' } });
      mockGroupManagementPlugin.getGroupStatus = jest
        .fn()
        .mockResolvedValueOnce({ data: { status: 'pending_delete' } });

      const params = {
        authenticatedUser: mockUser,
        identityPermissions: mockIdentityPermissions
      };
      await expect(dynamicAuthzService.createIdentityPermissions(params)).rejects.toThrow(GroupNotFoundError);
      expect(auditServiceWriteSpy).toHaveBeenCalledWith(
        {
          actor,
          source,
          action,
          requestBody: params,
          statusCode: 400
        },
        new GroupNotFoundError('One or more groups are not found')
      );
    });
    test('create identity permissions for invalid group', async () => {
      mockGroupManagementPlugin.getGroupStatus = jest
        .fn()
        .mockRejectedValueOnce(new GroupNotFoundError('Invalid group'));

      const params = {
        authenticatedUser: mockUser,
        identityPermissions: mockIdentityPermissions
      };
      await expect(dynamicAuthzService.createIdentityPermissions(params)).rejects.toThrow(GroupNotFoundError);
      expect(auditServiceWriteSpy).toHaveBeenCalledWith(
        {
          actor,
          source,
          action,
          requestBody: params,
          statusCode: 400
        },
        new GroupNotFoundError('Invalid group')
      );
    });

    test('exceed create identity permissions limit of 100', async () => {
      const exceededMockIdentityPermissions = Array(101).fill(mockIdentityPermission);
      const params = {
        authenticatedUser: mockUser,
        identityPermissions: exceededMockIdentityPermissions
      };
      await expect(dynamicAuthzService.createIdentityPermissions(params)).rejects.toThrow(
        ThroughputExceededError
      );

      expect(auditServiceWriteSpy).toHaveBeenCalledWith(
        {
          actor,
          source,
          action,
          requestBody: params,
          statusCode: 400
        },
        new ThroughputExceededError('Exceeds 100 identity permissions')
      );
    });
    describe('getUserGroups', () => {
      let userId: string;
      let groupIds: string[];

      beforeEach(() => {
        userId = 'userId';
        groupIds = ['123', '456', '789'];
      });

      it('returns an array of groupID in the data object that the requested user is in', async () => {
        mockGroupManagementPlugin.getUserGroups = jest.fn().mockResolvedValue({ data: { groupIds } });

        const response = await dynamicAuthzService.getUserGroups({ userId, authenticatedUser: mockUser });

        expect(response).toMatchObject<GetUserGroupsResponse>({ data: { groupIds } });
      });

      it('throws when the user cannot be found', async () => {
        mockGroupManagementPlugin.getUserGroups = jest.fn().mockRejectedValue(new Error());

        await expect(
          dynamicAuthzService.getUserGroups({ userId, authenticatedUser: mockUser })
        ).rejects.toThrow(Error);
      });
    });
  });
  describe('addUserToGroup', () => {
    it('returns userID and groupID when user was successfully added to group', async () => {
      mockGroupManagementPlugin.addUserToGroup = jest
        .fn()
        .mockResolvedValue({ data: { userId: 'userId', groupId: 'groupId' } });

      const request = {
        groupId: 'groupId',
        userId: 'userId',
        authenticatedUser: mockUser
      };

      const { data } = await dynamicAuthzService.addUserToGroup(request);

      expect(mockGroupManagementPlugin.addUserToGroup).toBeCalledWith(request);
      expect(data).toStrictEqual({ userId: 'userId', groupId: 'groupId' });
    });
  });

  describe('getIdentityPermissionsByIdentity', () => {
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
    beforeEach(() => {
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
    });
    test('get identity permissions by identity', async () => {
      mockDynamicAuthorizationPermissionsPlugin.getIdentityPermissionsByIdentity = jest
        .fn()
        .mockResolvedValue({
          data: {
            identityPermissions: [mockIdentityPermission]
          }
        });
      const request = {
        identityId: sampleGroupId,
        identityType: sampleGroupType
      };

      const { data } = await dynamicAuthzService.getIdentityPermissionsByIdentity(request);
      expect(data.identityPermissions).toStrictEqual([mockIdentityPermission]);
    });
  });
});

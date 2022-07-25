import {
  EndPointExistsError,
  EndPointTerminatedError,
  isEndPointExistsError,
  isEndPointTerminatedError,
  isRoleExistsOnEndpointError,
  RoleExistsOnEndpointError
} from '../';

const error = new Error();

describe('custom error tests', () => {
  test('endPointExistsError', () => {
    const endPointExistsError = new EndPointExistsError();

    expect(isEndPointExistsError(endPointExistsError)).toBe(true);
  });

  test('not endPointExistsError', () => {
    expect(isEndPointExistsError(error)).toBe(false);
  });

  test('endPointTerminatedError', () => {
    const endPointTerminatedError = new EndPointTerminatedError();

    expect(isEndPointTerminatedError(endPointTerminatedError)).toBe(true);
  });

  test('not endPointTerminatedError', () => {
    expect(isEndPointTerminatedError(error)).toBe(false);
  });

  test('RoleExistsOnEndPointError', () => {
    const roleExistsOnEndPointError = new RoleExistsOnEndpointError();

    expect(isRoleExistsOnEndpointError(roleExistsOnEndPointError)).toBe(true);
  });

  test('not RoleExistsOnEndPointError', () => {
    expect(isRoleExistsOnEndpointError(error)).toBe(false);
  });
});

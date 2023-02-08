/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// TODO: is this error needed after sshKeyService is done?
export class NoKeyExistsError extends Error {
  public readonly isNoKeyExistsError: boolean;

  public constructor(message?: string) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoKeyExistsError);
    }

    this.name = this.constructor.name;
    this.isNoKeyExistsError = true;
  }
}

export function isNoKeyExistsError(error: unknown): error is NoKeyExistsError {
  return Boolean(error) && (error as NoKeyExistsError).isNoKeyExistsError === true;
}

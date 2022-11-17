/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  CostCenterService,
  ListCostCentersRequest,
  ListCostCentersRequestParser,
  UpdateCostCenterRequest,
  UpdateCostCenterRequestParser
} from '@aws/workbench-core-accounts';
import CreateCostCenterSchema from '@aws/workbench-core-accounts/lib/schemas/createCostCenter';
import { Request, Response, Router } from 'express';
import { validate } from 'jsonschema';
import { wrapAsync } from './errorHandlers';
import { processValidatorResult, validateAndParse } from './validatorHelper';

export function setUpCostCenterRoutes(router: Router, costCenterService: CostCenterService): void {
  router.post(
    '/costCenters',
    wrapAsync(async (req: Request, res: Response) => {
      processValidatorResult(validate(req.body, CreateCostCenterSchema));
      res.send(await costCenterService.create({ ...req.body }));
    })
  );

  router.patch(
    '/costCenters/:id',
    wrapAsync(async (req: Request, res: Response) => {
      console.log('inside patch costCenter');
      const updateCostCenterRequest = { id: req.params.id, ...req.body };
      const validatedRequest = validateAndParse<UpdateCostCenterRequest>(
        UpdateCostCenterRequestParser,
        updateCostCenterRequest
      );
      res.send(await costCenterService.updateCostCenter(validatedRequest));
    })
  );

  router.get(
    '/costCenters/:id',
    wrapAsync(async (req: Request, res: Response) => {
      res.send(await costCenterService.getCostCenter(req.params.id));
    })
  );

  router.get(
    '/costCenters',
    wrapAsync(async (req: Request, res: Response) => {
      const validatedRequest = validateAndParse<ListCostCentersRequest>(
        ListCostCentersRequestParser,
        req.query
      );
      res.send(await costCenterService.listCostCenters(validatedRequest));
    })
  );
}

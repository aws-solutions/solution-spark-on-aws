export interface ExternalEndpoint {
  /**
   * The endpoint's unique identifier.
   */
  id?: string;

  /**
   * The name of the endpoint. This is to be unique within a DataSet.
   */
  name: string;

  /**
   * The time at which the endpoint was created.
   */
  createdAt?: string;

  /**
   * The identifier of the DataSet for which the endpoint was created.
   */
  dataSetId: string;

  /**
   * The name of the DataSet for which the endpoint was created.
   */
  dataSetName: string;

  /**
   * The path to the objects(files) in the DataSet storage for this endpoint.
   */
  path: string;

  /**
   * A list of role ARNs for which access has been granted for this endpoint.
   */
  allowedRoles?: string[];

  /**
   * A URL to reach this endpoint.
   */
  endPointUrl: string;

  /**
   * An optional alias through which the endpoint can be accessed.
   */
  endPointAlias?: string;

  /**
   * undefined is assumed to be 'ACTIVE'
   * An 'ACTIVE' endpoint should have a corresponding accesspoint configured on the DataSet.
   * A 'TERMINATED' endpoint no longer has an underlying accesspoint and is no longer usable.
   */

  status?: 'ACTIVE' | 'TERMINATED';
}

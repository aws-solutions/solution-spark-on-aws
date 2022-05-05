import axios from 'axios';
import _ from 'lodash';
import { data } from './cognito-config';

describe('IntegrationTest', () => {
  test("Service returns 'Hello World'", async () => {
    try {
      const body = JSON.stringify(data);
      const region = process.env.AWS_DEV_REGION;
      const url = `https://cognito-idp.${region}.amazonaws.com`;

      /**
       * Post request to initiateAuth
       *
       * @param url     - cognito idp url for your region
       * @param body    - request body
       * @param headers - request headers
       *
       */
      const initiateAuthResponse = await axios.post(url, body, {
        headers: {
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
          'Content-Type': 'application/x-amz-json-1.1'
        }
      });

      const idToken = _.get(initiateAuthResponse.data.AuthenticationResult, 'IdToken');

      const response = await axios.get(process.env.SERVICE_ENDPOINT!, {
        headers: {
          Authorization: `${idToken}`
        }
      });
      expect(response.data).toBe('Hello World');
    } catch (error) {
      console.log(error);
    }
  });
});

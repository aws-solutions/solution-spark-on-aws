import { PolicyDocument, PolicyStatement } from '@aws-cdk/aws-iam';
import IamHelper from './iamHelper';

describe('IamHelper', () => {
  describe('compareStatementPrincipal', () => {
    it('returns false when source has a principal and target does not.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementPrincipal(source, target)).toBe(false);
    });

    it('returns false when source has no principal but target does.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementPrincipal(source, target)).toBe(false);
    });

    it('returns false when the source and target principals do not match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "arn:aws:iam::123456789012:role/someRole"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementPrincipal(source, target)).toBe(false);
    });

    it('returns true when the source and target principals match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementPrincipal(source, target)).toBe(true);
    });
  });

  describe('compareStatementEffect', () => {
    it('returns false when the source and target effects do not match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Deny",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementEffect(source, target)).toBe(false);
    });
    it('returns true when the source and target effects match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementEffect(source, target)).toBe(true);
    });
  });

  describe('compareStatementAction', () => {
    it('returns false when the source and target actions do not match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "s3:GetObject",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "s3:PutObject",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementAction(source, target)).toBe(false);
    });

    it('returns false when the source has more actions than the target.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": ["s3:GetObject", "s3:PutObject"],
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "s3:PutObject",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementAction(source, target)).toBe(false);
    });

    it('returns true when the source and target match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": ["s3:GetObject", "s3:PutObject"],
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": ["s3:GetObject", "s3:PutObject"],
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementAction(source, target)).toBe(true);
    });
  });

  describe('compareStatementResource', () => {
    it('returns false when the source and target resources do not match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "arn:aws:s3:::someBucket"
        }
      `)
      );
      expect(IamHelper.compareStatementResource(source, target)).toBe(false);
    });

    it('returns false when the source has more actions than the target.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": ["arn:aws:s3:::someBucket", "arn:aws:s3:::someBucket/*"]
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementResource(source, target)).toBe(false);
    });

    it('returns true when the source and target match.', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*"
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementResource(source, target)).toBe(true);
    });
  });

  describe('compareStatementCondition', () => {
    it('returns false when one statement has a condition and the other does not', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      `)
      );
      expect(IamHelper.compareStatementCondition(source, target)).toBe(false);
    });

    it('returns false when the source key does not match the target key', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringNotEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.compareStatementCondition(source, target)).toBe(false);
    });

    it('returns false when the source value does not match the target value', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "000000000000"
            }
          }
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.compareStatementCondition(source, target)).toBe(false);
    });

    it('returns true when the conditions match', () => {
      const source = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Action": "*",
          "Effect": "Allow",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.compareStatementCondition(source, target)).toBe(true);
    });
  });

  describe('policyDocumentContainsStatement', () => {
    it('returns false when the principals do not match', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "arn:aws:iam::123456789012:role/someRole"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBeFalsy();
    });

    it('returns false when the effects do not match', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Deny",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBeFalsy();
    });

    it('returns false when the actions do not match', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "s3:PutObject",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBeFalsy();
    });

    it('returns false when the resources do not match', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "arn:aws:s3:::someBucket",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBeFalsy();
    });

    it('returns false when the conditions do not match', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringNotEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBeFalsy();
    });

    it('returns true when the document includes the statement.', () => {
      const source = PolicyDocument.fromJson(
        JSON.parse(`
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Principal": {
              "AWS": "*"
            },
            "Action": "*",
            "Effect": "Allow",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "s3:DataAccessPointAccount": "123456789012"
              }
            }
          }
        ]
      }
      `)
      );
      const target = PolicyStatement.fromJson(
        JSON.parse(`
        {
          "Principal": {
            "AWS": "*"
          },
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*",
          "Condition": {
            "StringEquals": {
              "s3:DataAccessPointAccount": "123456789012"
            }
          }
        }
      `)
      );
      expect(IamHelper.policyDocumentContainsStatement(source, target)).toBe(true);
    });
  });
});

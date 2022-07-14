import { PolicyDocument, PolicyStatement } from '@aws-cdk/aws-iam';
import _ from 'lodash';

export class IamHelper {
  public static containsStatementId(source: PolicyDocument, targetSid: string): boolean {
    const policyObj = source.toJSON();
    return (
      policyObj &&
      policyObj.Statement &&
      !!_.find(policyObj.Statement, (s) => {
        const statement: PolicyStatement = PolicyStatement.fromJson(s);
        return statement.sid === targetSid;
      })
    );
  }

  public static addPrincipalToStatement(
    source: PolicyDocument,
    targetSid: string,
    awsPrincipal: string
  ): PolicyDocument {
    const policyObj = source.toJSON();
    if (!policyObj || !policyObj.Statement) {
      throw new Error('Cannot add principal. Policy document is invalid');
    }
    const returnDoc = new PolicyDocument();
    _.forEach(policyObj.Statement, (s) => {
      if (s.Sid === targetSid) {
        if (!_.isArray(s.Principal.AWS)) s.Principal.AWS = [s.Principal.AWS];
        s.Principal.AWS.push(awsPrincipal);
        s.Principal.AWS = _.uniq(s.Principal.AWS);
      }
      const statement: PolicyStatement = PolicyStatement.fromJson(s);
      returnDoc.addStatements(statement);
    });
    return returnDoc;
  }

  public static compareStatementPrincipal(source: PolicyStatement, target: PolicyStatement): boolean {
    if (source.hasPrincipal !== target.hasPrincipal) return false;
    return source.principals.every((sp) => {
      const fragment: string = JSON.stringify(sp.policyFragment.principalJson);
      return target.principals.find((tp) => JSON.stringify(tp.policyFragment.principalJson) === fragment);
    });
  }

  public static compareStatementEffect(source: PolicyStatement, target: PolicyStatement): boolean {
    return source.effect === target.effect;
  }

  public static compareStatementAction(source: PolicyStatement, target: PolicyStatement): boolean {
    if (source.actions.length !== target.actions.length) return false;
    return source.actions.every((sa) => target.actions.find((ta) => ta === sa));
  }

  public static compareStatementResource(source: PolicyStatement, target: PolicyStatement): boolean {
    if (source.resources.length !== target.resources.length) return false;
    return source.resources.every((sr) => target.resources.find((tr) => tr === sr));
  }

  public static compareStatementCondition(source: PolicyStatement, target: PolicyStatement): boolean {
    return JSON.stringify(source.conditions) === JSON.stringify(target.conditions);
  }

  public static policyDocumentContainsStatement(
    document: PolicyDocument,
    searchStatement: PolicyStatement
  ): boolean {
    const policyObj = document.toJSON();
    return (
      policyObj &&
      policyObj.Statement &&
      !!_.find(policyObj.Statement, (s) => {
        const statement: PolicyStatement = PolicyStatement.fromJson(s);
        return (
          IamHelper.compareStatementPrincipal(statement, searchStatement) &&
          IamHelper.compareStatementEffect(statement, searchStatement) &&
          IamHelper.compareStatementAction(statement, searchStatement) &&
          IamHelper.compareStatementResource(statement, searchStatement) &&
          IamHelper.compareStatementCondition(statement, searchStatement)
        );
      })
    );
  }
}

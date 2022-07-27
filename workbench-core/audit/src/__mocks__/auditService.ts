import AuditPlugin from '../auditPlugin';
import Metadata from '../metadata';

export default class AuditService {
  public constructor(
    auditPlugin: AuditPlugin,
    continueOnError: boolean = false,
    requiredAuditValues: string[] = ['actor', 'source', 'statusCode', 'action'],
    fieldsToMask: string[] = ['password', 'accessKey']
  ) {}

  public async write(metadata: Metadata, body?: object): Promise<void> {}
}

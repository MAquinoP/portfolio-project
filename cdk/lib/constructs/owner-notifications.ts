import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ses from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";

export interface OwnerNotificationsProps {
  readonly ownerEmail: string;
}

export class OwnerNotifications extends Construct {
  public readonly identityArn: string;
  private readonly ownerEmail: string;

  constructor(scope: Construct, id: string, props: OwnerNotificationsProps) {
    super(scope, id);

    this.ownerEmail = props.ownerEmail;

    new ses.CfnEmailIdentity(this, "Identity", {
      emailIdentity: props.ownerEmail,
    });

    this.identityArn = cdk.Stack.of(this).formatArn({
      service: "ses",
      resource: "identity",
      resourceName: props.ownerEmail,
    });
  }

  public grantSend(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ["ses:SendEmail"],
      resourceArns: [this.identityArn],
      conditions: {
        StringEquals: { "ses:FromAddress": this.ownerEmail },
      },
    });
  }
}

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface ContactFunctionProps {
  readonly codePath: string;
  readonly tableName: string;
  readonly ownerEmail: string;
}

export class ContactFunction extends Construct {
  public readonly handler: lambda.Function;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ContactFunctionProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    this.logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/aws/lambda/${stackName}-contact`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.handler = new lambda.Function(this, "Function", {
      functionName: `${stackName}-contact`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: "index.handler",
      code: lambda.Code.fromAsset(props.codePath),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      logGroup: this.logGroup,
      environment: {
        TABLE_NAME: props.tableName,
        OWNER_EMAIL: props.ownerEmail,
      },
    });
  }
}

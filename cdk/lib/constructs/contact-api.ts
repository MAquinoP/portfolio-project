import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface ContactApiProps {
  readonly handler: lambda.IFunction;
  readonly resourcePath: string;
  readonly rateLimit: number;
  readonly burstLimit: number;
}

export class ContactApi extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ContactApiProps) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, "RestApi", {
      restApiName: `${cdk.Stack.of(this).stackName}-api`,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: "prod",
        throttlingRateLimit: props.rateLimit,
        throttlingBurstLimit: props.burstLimit,
      },
    });

    this.api.root
      .addResource(props.resourcePath)
      .addMethod("POST", new apigateway.LambdaIntegration(props.handler));
  }
}

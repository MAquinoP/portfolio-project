import * as cdk from "aws-cdk-lib";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export interface EdgeFirewallProps {
  readonly protectedPath: string;
  readonly requestsPerIp: number;
  readonly evaluationWindowSeconds: number;
}

export class EdgeFirewall extends Construct {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: EdgeFirewallProps) {
    super(scope, id);

    const stackName = cdk.Stack.of(this).stackName;

    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      name: `${stackName}-waf`,
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${stackName}-waf`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "AwsCommonRules",
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${stackName}-common-rules`,
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "ContactRateLimit",
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: props.requestsPerIp,
              aggregateKeyType: "IP",
              evaluationWindowSec: props.evaluationWindowSeconds,
              scopeDownStatement: {
                byteMatchStatement: {
                  searchString: props.protectedPath,
                  fieldToMatch: { uriPath: {} },
                  textTransformations: [{ priority: 0, type: "NONE" }],
                  positionalConstraint: "STARTS_WITH",
                },
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${stackName}-contact-rate`,
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;
  }
}

import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";

export interface CostGuardrailProps {
  readonly monthlyLimitUsd: number;
  readonly alertThresholdsUsd: number[];
  readonly notifyEmail: string;
}

export class CostGuardrail extends Construct {
  constructor(scope: Construct, id: string, props: CostGuardrailProps) {
    super(scope, id);

    new budgets.CfnBudget(this, "Budget", {
      budget: {
        budgetName: `${cdk.Stack.of(this).stackName}-monthly`,
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: props.monthlyLimitUsd, unit: "USD" },
      },
      notificationsWithSubscribers: props.alertThresholdsUsd.map((threshold) => ({
        notification: {
          notificationType: "ACTUAL",
          comparisonOperator: "GREATER_THAN",
          threshold,
          thresholdType: "ABSOLUTE_VALUE",
        },
        subscribers: [{ subscriptionType: "EMAIL", address: props.notifyEmail }],
      })),
    });
  }
}

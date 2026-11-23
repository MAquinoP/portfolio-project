import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import { ContactApi } from "./constructs/contact-api";
import { ContactFunction } from "./constructs/contact-function";
import { CostGuardrail } from "./constructs/cost-guardrail";
import { EdgeDistribution } from "./constructs/edge-distribution";
import { MessageStore } from "./constructs/message-store";
import { OwnerNotifications } from "./constructs/owner-notifications";
import { SiteStorage } from "./constructs/site-storage";

const CONTACT_PATH = "contacto";
const API_RATE_LIMIT = 5;
const API_BURST_LIMIT = 10;
const BUDGET_LIMIT_USD = 5;
const BUDGET_ALERTS_USD = [1, 5];

export interface PortfolioStackProps extends cdk.StackProps {
  ownerEmail: string;
}

export class PortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioStackProps) {
    super(scope, id, props);

    const storage = new SiteStorage(this, "SiteStorage");

    const messages = new MessageStore(this, "MessageStore");

    const notifications = new OwnerNotifications(this, "OwnerNotifications", {
      ownerEmail: props.ownerEmail,
    });

    const contact = new ContactFunction(this, "ContactFunction", {
      codePath: path.join(__dirname, "../../lambda"),
      tableName: messages.table.tableName,
      ownerEmail: props.ownerEmail,
    });

    messages.grantWrite(contact.handler);
    notifications.grantSend(contact.handler);

    const api = new ContactApi(this, "ContactApi", {
      handler: contact.handler,
      resourcePath: CONTACT_PATH,
      rateLimit: API_RATE_LIMIT,
      burstLimit: API_BURST_LIMIT,
    });

    const edge = new EdgeDistribution(this, "EdgeDistribution", {
      siteBucket: storage.bucket,
      contactApi: api.api,
      contactPath: CONTACT_PATH,
    });

    new CostGuardrail(this, "CostGuardrail", {
      monthlyLimitUsd: BUDGET_LIMIT_USD,
      alertThresholdsUsd: BUDGET_ALERTS_USD,
      notifyEmail: props.ownerEmail,
    });

    new cdk.CfnOutput(this, "SiteUrl", { value: edge.siteUrl });
    new cdk.CfnOutput(this, "ContactEndpoint", { value: `${edge.siteUrl}/${CONTACT_PATH}` });
    new cdk.CfnOutput(this, "SiteBucketName", { value: storage.bucket.bucketName });
    new cdk.CfnOutput(this, "MessagesTableName", { value: messages.table.tableName });
  }
}

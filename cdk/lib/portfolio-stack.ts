import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import { ContactApi } from "./constructs/contact-api";
import { ContactFunction } from "./constructs/contact-function";
import { CostGuardrail } from "./constructs/cost-guardrail";
import { EdgeDistribution } from "./constructs/edge-distribution";
import { EdgeFirewall } from "./constructs/edge-firewall";
import { MessageStore } from "./constructs/message-store";
import { OwnerNotifications } from "./constructs/owner-notifications";
import { SiteStorage } from "./constructs/site-storage";

const CONTACT_PATH = "contacto";
const API_RATE_LIMIT = 5;
const API_BURST_LIMIT = 10;
const WAF_REQUESTS_PER_IP = 100;
const WAF_WINDOW_SECONDS = 300;
const BUDGET_LIMIT_USD = 8;
const BUDGET_ALERTS_USD = [5, 8];

export interface PortfolioStackProps extends cdk.StackProps {
  ownerEmail: string;
  enableWaf: boolean;
}

export class PortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioStackProps) {
    super(scope, id, props);

    if (props.enableWaf && cdk.Stack.of(this).region !== "us-east-1") {
      throw new Error("CloudFront WAF web ACLs are created in us-east-1. Deploy this stack in us-east-1.");
    }

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

    const firewall = props.enableWaf
      ? new EdgeFirewall(this, "EdgeFirewall", {
          protectedPath: `/${CONTACT_PATH}`,
          requestsPerIp: WAF_REQUESTS_PER_IP,
          evaluationWindowSeconds: WAF_WINDOW_SECONDS,
        })
      : undefined;

    const edge = new EdgeDistribution(this, "EdgeDistribution", {
      siteBucket: storage.bucket,
      contactApi: api.api,
      contactPath: CONTACT_PATH,
      webAclArn: firewall?.webAclArn,
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

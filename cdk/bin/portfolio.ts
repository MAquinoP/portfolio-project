#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PortfolioStack } from "../lib/portfolio-stack";

const app = new cdk.App();

const ownerEmail = app.node.tryGetContext("ownerEmail");
if (typeof ownerEmail !== "string" || ownerEmail.length === 0) {
  throw new Error("Pass the owner email with: cdk synth -c ownerEmail=<your-email>");
}

const student = app.node.tryGetContext("student");
if (typeof student !== "string" || !/^[a-z0-9-]{2,20}$/.test(student)) {
  throw new Error("Pass your name with: cdk synth -c student=<lowercase-name>");
}

const enableWaf = app.node.tryGetContext("enableWaf") !== "false";

new PortfolioStack(app, `portafolio-${student}`, {
  ownerEmail,
  enableWaf,
  env: { region: "us-east-1" },
});

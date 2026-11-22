import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
ses = boto3.client("ses")
owner_email = os.environ["OWNER_EMAIL"]
email_pattern = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
json_headers = {"Content-Type": "application/json"}


def respond(status_code, payload):
    return {"statusCode": status_code, "headers": json_headers, "body": json.dumps(payload)}


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return respond(400, {"error": "Request body must be valid JSON"})

    if body.get("website"):
        return respond(200, {"status": "received"})

    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).strip()
    message = str(body.get("message", "")).strip()

    if not 2 <= len(name) <= 100:
        return respond(400, {"error": "Name must have between 2 and 100 characters"})
    if len(email) > 254 or not email_pattern.match(email):
        return respond(400, {"error": "Email is not valid"})
    if not 10 <= len(message) <= 2000:
        return respond(400, {"error": "Message must have between 10 and 2000 characters"})

    message_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    table.put_item(
        Item={
            "messageId": message_id,
            "createdAt": created_at,
            "name": name,
            "email": email,
            "message": message,
        }
    )

    ses.send_email(
        Source=owner_email,
        Destination={"ToAddresses": [owner_email]},
        ReplyToAddresses=[email],
        Message={
            "Subject": {"Data": f"Portfolio message from {name}"},
            "Body": {"Text": {"Data": f"Name: {name}\nEmail: {email}\nMessage ID: {message_id}\n\n{message}"}},
        },
    )

    return respond(200, {"status": "received", "messageId": message_id})

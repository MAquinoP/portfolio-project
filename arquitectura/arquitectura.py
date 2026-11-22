import base64
import os
import subprocess

def icon_root():
    import diagrams

    base = os.path.dirname(os.path.dirname(os.path.abspath(diagrams.__file__)))
    return os.path.join(base, "resources", "aws")


ICONS = icon_root()

ICON = {
    "waf": "security/waf.png",
    "cloudfront": "network/cloudfront.png",
    "s3": "storage/simple-storage-service-s3.png",
    "apigateway": "network/api-gateway.png",
    "lambda": "compute/lambda.png",
    "iam": "security/identity-and-access-management-iam-role.png",
    "dynamodb": "database/dynamodb.png",
    "ses": "engagement/simple-email-service-ses.png",
    "cloudwatch": "management/cloudwatch.png",
    "budgets": "cost/budgets.png",
    "users": "general/users.png",
    "user": "general/user.png",
    "cdk": "devtools/cloud-development-kit.png",
    "cloudformation": "management/cloudformation.png",
    "stack": "management/cloudformation-stack.png",
}

FONT = "Helvetica, Arial, sans-serif"
INK = "#232f3e"
MUTED = "#55606e"

BLUE = "#2563eb"
PURPLE = "#7c3aed"
GREEN = "#047857"
AMBER = "#b45309"
GRAY = "#6b7280"

ICON_SIZE = 78
LABEL_GAP = 60
LABEL_STEP = 23
LABEL_SIZE = 19
ZONE_LABEL_SIZE = 21
ZONE_PAD_X = 24
ZONE_PAD_Y = 34
EDGE_LABEL_SIZE = 18


def embed(key):
    with open(os.path.join(ICONS, ICON[key]), "rb") as handle:
        return "data:image/png;base64," + base64.b64encode(handle.read()).decode()


def text_width(value, size):
    return len(value) * size * 0.54


class Canvas:
    def __init__(self, width, height, title):
        self.width = width
        self.height = height
        self.title = title
        self.zones = []
        self.arrows = []
        self.nodes = []
        self.notes = []
        self.colors = set()

    def zone(self, x, y, w, h, label, stroke, fill, dashed=False, label_color=None):
        self.zones.append((x, y, w, h, label, stroke, fill, dashed, label_color or stroke))

    def node(self, cx, cy, key, lines):
        self.nodes.append((cx, cy, key, lines))

    def note(self, x, y, value, size=17, color=None, anchor="middle"):
        self.notes.append((x, y, value, size, color or MUTED, anchor))

    def arrow(self, points, label=None, color=INK, dashed=False, label_at=None, width=2.4, head=True):
        self.colors.add(color)
        self.arrows.append((points, label, color, dashed, label_at, width, head))

    def render(self):
        out = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" '
            f'viewBox="0 0 {self.width} {self.height}">',
            f'<rect width="{self.width}" height="{self.height}" fill="#ffffff"/>',
            "<defs>",
        ]
        for color in sorted(self.colors):
            ident = color.replace("#", "")
            out.append(
                f'<marker id="h{ident}" markerWidth="9" markerHeight="7" refX="8" refY="3.5" '
                f'orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill="{color}"/></marker>'
            )
        out.append("</defs>")

        for x, y, w, h, label, stroke, fill, dashed, label_color in self.zones:
            dash = ' stroke-dasharray="10 7"' if dashed else ""
            out.append(
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" '
                f'stroke="{stroke}" stroke-width="2"{dash}/>'
            )
            out.append(
                f'<text x="{x + ZONE_PAD_X}" y="{y + ZONE_PAD_Y}" font-family="{FONT}" '
                f'font-size="{ZONE_LABEL_SIZE}" fill="{label_color}" font-weight="600">{label}</text>'
            )

        for points, label, color, dashed, label_at, width, head in self.arrows:
            dash = ' stroke-dasharray="7 6"' if dashed else ""
            marker = f' marker-end="url(#h{color.replace("#", "")})"' if head else ""
            path = " ".join(f"{px},{py}" for px, py in points)
            out.append(
                f'<polyline points="{path}" fill="none" stroke="{color}" stroke-width="{width}" '
                f'stroke-linejoin="round"{dash}{marker}/>'
            )
            if label:
                lx, ly = label_at
                half = text_width(label, EDGE_LABEL_SIZE) / 2 + 7
                out.append(
                    f'<rect x="{lx - half}" y="{ly - EDGE_LABEL_SIZE}" width="{half * 2}" '
                    f'height="{EDGE_LABEL_SIZE + 9}" fill="#ffffff" opacity="0.92" rx="4"/>'
                )
                out.append(
                    f'<text x="{lx}" y="{ly}" font-family="{FONT}" font-size="{EDGE_LABEL_SIZE}" '
                    f'fill="{color}" text-anchor="middle" font-weight="500">{label}</text>'
                )

        for cx, cy, key, lines in self.nodes:
            half = ICON_SIZE / 2
            out.append(
                f'<image href="{embed(key)}" x="{cx - half}" y="{cy - half}" '
                f'width="{ICON_SIZE}" height="{ICON_SIZE}"/>'
            )
            for index, line in enumerate(lines):
                weight = "600" if index == 0 else "400"
                color = INK if index == 0 else MUTED
                size = LABEL_SIZE if index == 0 else LABEL_SIZE - 2
                out.append(
                    f'<text x="{cx}" y="{cy + LABEL_GAP + index * LABEL_STEP}" font-family="{FONT}" '
                    f'font-size="{size}" fill="{color}" text-anchor="middle" '
                    f'font-weight="{weight}">{line}</text>'
                )

        for x, y, value, size, color, anchor in self.notes:
            out.append(
                f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" fill="{color}" '
                f'text-anchor="{anchor}">{value}</text>'
            )

        out.append(
            f'<text x="{self.width / 2}" y="{self.height - 26}" font-family="{FONT}" font-size="26" '
            f'fill="{INK}" text-anchor="middle" font-weight="600">{self.title}</text>'
        )
        out.append("</svg>")
        return "\n".join(out)


def write(canvas, name, scale=2):
    svg_path = f"{name}.svg"
    with open(svg_path, "w", encoding="utf-8") as handle:
        handle.write(canvas.render())
    subprocess.run(
        ["rsvg-convert", "-z", str(scale), "-o", f"{name}.png", svg_path],
        check=True,
    )


def build_runtime():
    c = Canvas(1860, 1120, "Portafolio serverless en AWS")

    c.zone(150, 40, 1500, 1000, "AWS Cloud", "#232f3e", "#fcfcfd")
    c.zone(195, 285, 385, 335, "Borde global", BLUE, "#eff6ff", dashed=True)
    c.zone(620, 110, 910, 895, "Region  us-east-1", "#0f766e", "#f8fafc", dashed=True)
    c.zone(655, 150, 260, 210, "Origen del sitio", GREEN, "#ecfdf5")
    c.zone(655, 400, 645, 210, "API de contacto", PURPLE, "#f5f3ff")
    c.zone(655, 730, 400, 240, "Observabilidad y gobierno", AMBER, "#fffbeb")
    c.zone(1105, 730, 390, 240, "Datos y correo", GREEN, "#ecfdf5")

    c.node(72, 500, "users", ["Visitante"])
    c.node(478, 350, "waf", ["AWS WAF", "protege la entrega"])
    c.node(420, 500, "cloudfront", ["CloudFront"])
    c.node(785, 250, "s3", ["S3 privado"])
    c.node(790, 500, "apigateway", ["API Gateway REST"])
    c.node(1120, 500, "lambda", ["Lambda contact"])
    c.node(765, 860, "cloudwatch", ["CloudWatch Logs"])
    c.node(955, 860, "budgets", ["AWS Budgets"])
    c.node(1230, 860, "dynamodb", ["DynamoDB"])
    c.node(1420, 860, "ses", ["SES"])
    c.node(1740, 860, "user", ["Buzon del dueno"])

    c.arrow([(115, 500), (375, 500)], "1. HTTPS", BLUE, label_at=(245, 486))
    c.arrow([(420, 457), (420, 250), (740, 250)], "2.  /  cacheado", GREEN, label_at=(580, 236))
    c.arrow([(463, 500), (745, 500)], "3.  /contacto  sin cache", PURPLE, label_at=(604, 486))
    c.arrow([(833, 500), (1075, 500)], "4. AWS_PROXY", PURPLE, label_at=(954, 486))
    c.arrow([(1163, 485), (1420, 485), (1420, 815)], "6. SendEmail", GREEN, label_at=(1290, 471))
    c.arrow([(1163, 515), (1230, 515), (1230, 815)], "5. PutItem", GREEN, label_at=(1312, 660))
    c.arrow(
        [(1077, 530), (1000, 530), (1000, 712), (765, 712), (765, 815)],
        "7. registros",
        AMBER,
        dashed=True,
        label_at=(880, 698),
    )
    c.arrow([(1463, 860), (1695, 860)], "8. correo al dueno", GREEN, label_at=(1579, 846))

    write(c, "arquitectura")


def build_pipeline():
    c = Canvas(1440, 600, "Dos caminos hacia la misma pila")

    c.zone(190, 150, 600, 340, "Definicion de la infraestructura", PURPLE, "#f5f3ff")
    c.zone(1060, 290, 280, 200, "Resultado", GREEN, "#ecfdf5")

    c.node(80, 300, "user", ["Estudiante"])
    c.node(330, 245, "cdk", ["Proyecto CDK"])
    c.node(650, 380, "cloudformation", ["portfolio.yaml"])
    c.node(920, 380, "cloudformation", ["CloudFormation"])
    c.node(1195, 380, "stack", ["Pila portafolio-cfn"])

    c.arrow([(123, 285), (170, 285), (170, 245), (287, 245)], "escribe codigo", PURPLE, label_at=(230, 231))
    c.arrow([(123, 315), (230, 315), (230, 380), (607, 380)], "carga en la consola", BLUE, label_at=(420, 366))
    c.arrow([(373, 245), (650, 245), (650, 341)], "cdk synth", PURPLE, dashed=True, label_at=(510, 231))
    c.arrow([(693, 380), (877, 380)], "crea o actualiza", GREEN, label_at=(785, 366))
    c.arrow([(963, 380), (1152, 380)], "aprovisiona", GREEN, label_at=(1058, 366))

    write(c, "arquitectura-despliegue")


if __name__ == "__main__":
    build_runtime()
    build_pipeline()

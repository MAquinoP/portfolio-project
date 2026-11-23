# Portafolio serverless en AWS

Proyecto del laboratorio de AWS CDK para el curso de preparación de la certificación AWS Certified Cloud Practitioner (CLF-C02). Despliega un portafolio personal con formulario de contacto sobre infraestructura como código.

## Comandos

Todos desde `cdk/`. El contexto `student` da nombre a la pila y es obligatorio.

```bash
npm install
npx tsc --noEmit -p .
npx cdk synth  -c ownerEmail=<correo> -c student=<nombre>
npx cdk diff   -c ownerEmail=<correo> -c student=<nombre>
npx cdk deploy -c ownerEmail=<correo> -c student=<nombre>
npx cdk destroy -c ownerEmail=<correo> -c student=<nombre>
```

Publicar el sitio, desde la raíz, con el nombre de bucket que sale en las salidas de la pila:

```bash
aws s3 sync site "s3://$BUCKET/" --delete
```

Regenerar los diagramas: `cd arquitectura && python3 arquitectura.py`. Requiere el paquete `diagrams` (solo por los iconos oficiales de AWS) y `rsvg-convert` para pasar el SVG a PNG.

## Arquitectura

CloudFront sirve el sitio desde un bucket de S3 privado al que solo él puede leer, mediante Origin Access Control. La ruta `/contacto` va por el mismo dominio a API Gateway REST, que invoca una función Lambda en Python. La función valida el mensaje, lo guarda en DynamoDB y lo envía por SES al correo del dueño. Los registros van a CloudWatch y hay un presupuesto con alertas.

La región está fijada a `us-east-1` en `bin/portfolio.ts`.

## Estructura

| Ruta | Contenido |
|---|---|
| `cdk/lib/portfolio-stack.ts` | Compone los constructs y conecta los permisos. Las constantes de configuración viven aquí |
| `cdk/lib/constructs/` | Un construct por responsabilidad: almacenamiento, tabla, SES, Lambda, API, CloudFront, presupuesto |
| `lambda/index.py` | Función de contacto |
| `site/` | Portafolio estático: `index.html`, `style.css`, `script.js` e `img/` |
| `arquitectura/` | Generador de los diagramas en SVG, y los diagramas |
| `datos-portafolio-plantilla.txt` | Plantilla en blanco con los campos de contenido del portafolio |
| `datos-portafolio.txt` | Los datos reales de quien despliega. Está en el `.gitignore` |

## Decisiones de diseño, no cambiar sin motivo

**Constructs dentro de una sola pila, no varias pilas.** Separar en pilas crearía referencias cruzadas que impiden eliminar recursos mientras otra pila los exporte. El sistema se despliega y se borra junto.

**Los permisos se conceden con métodos, no a mano.** `MessageStore.grantWrite()` y `OwnerNotifications.grantSend()`. Se usa `table.grant(fn, "dynamodb:PutItem")` en lugar de `grantWriteData()` a propósito: este último concedería además borrar y actualizar, y se perdería el privilegio mínimo.

**El nombre de la pila sale del contexto `student`.** Todos los nombres de recursos derivan de `stackName`, de forma que varias personas puedan desplegar en la misma cuenta sin pisarse.

**No hay WAF.** Se quitó del proyecto por costo: era casi todo el gasto fijo. Sin él la arquitectura cuesta menos de 1 USD al mes.

## Convenciones

- Código, nombres e identificadores en inglés. Documentación y textos de la interfaz en español.
- Sin comentarios en el código. Si algo necesita explicación, va en el README.
- Sin valores de relleno ni marcadores del tipo "reemplazar por". Lo pendiente se comunica, no se escribe en el código.
- Sin guiones largos en ningún texto.

## Cosas que muerden

**El bucket tiene versionado y no borra objetos solo.** `cdk destroy` falla si quedan archivos. Hay que vaciarlo antes, incluidas las versiones ocultas.

**CloudFront cachea 24 horas.** Después de volver a subir el sitio los cambios no se ven hasta invalidar la caché de la distribución.

**SES exige verificar la identidad.** Hasta que se abra el enlace del correo, el formulario guarda el mensaje en DynamoDB pero falla al enviarlo.

**CloudFront tarda varios minutos** en crearse y otros tantos en borrarse. No es que esté colgado.

**`cdk deploy` necesita credenciales en terminal**, no basta con la sesión de la consola, y la cuenta debe tener `cdk bootstrap` hecho en us-east-1.

**El `.gitignore` ignora `*.js`** para no subir el TypeScript compilado, con una excepción explícita para `site/script.js`. Si agregas JavaScript al sitio, añade su excepción o no se subirá.

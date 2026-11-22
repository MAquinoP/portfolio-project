# Portafolio con AWS CDK

Toda la infraestructura del portafolio, descrita en TypeScript. CDK no reemplaza a CloudFormation: genera una plantilla y se la entrega al mismo motor, así que lo que acaba desplegado es una pila de CloudFormation como cualquier otra.

## Requisitos

- Node.js 22 o superior.
- Credenciales de AWS configuradas, por ejemplo con `aws configure`.
- La región queda fijada a **us-east-1** en `bin/portfolio.ts`, porque la Web ACL de CloudFront solo se crea ahí.

## Instalar

```bash
npm install
```

Comprobar que el proyecto compila:

```bash
npx tsc --noEmit -p .
```

## Configuración

El correo del dueño no está escrito en el código, se pasa como contexto en cada comando:

| Contexto | Obligatorio | Valor por defecto | Para qué sirve |
|---|---|---|---|
| `ownerEmail` | sí | sin valor | Dirección que recibe los mensajes y que se registra en SES |
| `enableWaf` | no | `true` | Con `enableWaf=false` no se crea la Web ACL ni se asocia a CloudFront |

Si falta `ownerEmail` o `student`, la aplicación se detiene con un mensaje que te lo recuerda. El contexto `student` da nombre a la pila, para que varias personas puedan desplegar en la misma cuenta sin pisarse.

## Estructura del proyecto

La pila no define recursos directamente: los compone a partir de constructs, cada uno con una sola responsabilidad.

| Archivo | De qué se encarga |
|---|---|
| `lib/portfolio-stack.ts` | Compone los constructs y conecta los permisos entre ellos |
| `lib/constructs/site-storage.ts` | El bucket privado del sitio |
| `lib/constructs/message-store.ts` | La tabla de DynamoDB, y el permiso de escritura |
| `lib/constructs/owner-notifications.ts` | La identidad de SES, y el permiso de envío |
| `lib/constructs/contact-function.ts` | La función Lambda y su grupo de registros |
| `lib/constructs/contact-api.ts` | La API REST y su integración con la función |
| `lib/constructs/edge-firewall.ts` | La Web ACL de WAF |
| `lib/constructs/edge-distribution.ts` | La distribución de CloudFront y sus dos orígenes |
| `lib/constructs/cost-guardrail.ts` | El presupuesto con alertas |

Son constructs dentro de **una sola pila**, no varias pilas. Separar en pilas crearía referencias cruzadas entre ellas, y esas referencias impiden eliminar un recurso mientras otra pila lo esté usando. Para un sistema que se despliega y se borra junto, la recomendación de AWS es una pila con varios constructs.

Dos detalles de diseño que vale la pena mirar:

Los permisos **no** se escriben a mano. `message-store.ts` expone `grantWrite()` y `owner-notifications.ts` expone `grantSend()`, y es la pila la que los conecta. Cada construct decide qué permiso concede sobre lo suyo, y nadie más tiene que conocer los ARN.

Los números de configuración viven en la pila, no escondidos dentro de los constructs. El límite de peticiones, el monto del presupuesto y la ventana del WAF están arriba del archivo `portfolio-stack.ts`, donde se ven todos juntos.

## Comandos

Generar la plantilla sin desplegar nada. Es la parte que puedes hacer sin tocar la cuenta:

```bash
npx cdk synth -c ownerEmail=tu-correo@ejemplo.com -c student=tunombre
```

El resultado queda en `cdk.out/portafolio-tunombre.template.json`. Vale la pena abrirlo y compararlo con `portfolio.yaml`: vas a encontrar recursos que no escribiste, como un rol para que API Gateway publique registros, que CDK agrega por su cuenta.

Ver qué cambiaría respecto a lo que ya está desplegado:

```bash
npx cdk diff -c ownerEmail=tu-correo@ejemplo.com -c student=tunombre
```

Desplegar y eliminar:

```bash
npx cdk deploy -c ownerEmail=tu-correo@ejemplo.com -c student=tunombre
npx cdk destroy -c ownerEmail=tu-correo@ejemplo.com -c student=tunombre
```

Sin WAF:

```bash
npx cdk synth -c ownerEmail=tu-correo@ejemplo.com -c student=tunombre -c enableWaf=false
```

## Sobre el bootstrap

`cdk deploy` exige haber ejecutado antes `npx cdk bootstrap`. Ese comando crea una pila aparte llamada `CDKToolkit`, con un bucket de S3 y varios roles que **no** desaparecen al ejecutar `cdk destroy`. Si lo usas, elimina esa pila desde la consola de CloudFormation al terminar, o quedará consumiendo almacenamiento.

Si solo quieres entender la diferencia entre escribir una plantilla y generarla, `cdk synth` y `cdk diff` alcanzan y no requieren bootstrap.

## Nombres de pila

Esta aplicación despliega la pila `portafolio-<tunombre>`, armada con el contexto `student`. El nombre sale de ahí para que varias personas puedan desplegar en la misma cuenta sin pisarse: cada una obtiene su propia pila y su propio conjunto de recursos.

## Código de la función

La función de contacto se toma de la carpeta `lambda/` del proyecto, un nivel arriba de esta, mediante `lambda.Code.fromAsset`. Cualquier cambio en `lambda/index.py` entra en el siguiente despliegue.

## Publicar el sitio

CDK crea el bucket vacío. Los archivos de `site/` se suben después, usando el nombre de bucket que aparece en las salidas de la pila.

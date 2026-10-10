import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  // Documentación: http://localhost:4003/api (JSON en /api-json)
  // "Authorize" en Swagger UI permite cargar el header x-api-key una sola vez.
  const config = new DocumentBuilder()
    .setTitle('examen-cache')
    .setDescription('Caché de precios y límite de peticiones (NestJS + Redis)')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 4003);
  await app.listen(port);
  console.log(`examen-cache escuchando en http://localhost:${port} (Swagger en /api)`);
}
bootstrap();

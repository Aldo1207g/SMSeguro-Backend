import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para que Xcode y la web puedan conectarse sin bloqueos
  app.enableCors();

  // Habilitar validación automática con DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Descarta campos que no estén en el DTO
      forbidNonWhitelisted: true, // Arroja error si mandan campos basura
      transform: true,
    }),
  );

  // --- CONFIGURACIÓN DE SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('SMSeguro API')
    .setDescription('Documentación de los endpoints del backend')
    .setVersion('1.0')
    .addBearerAuth() // Agrega el botón del candado para meter el token
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  // --------------------------------

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
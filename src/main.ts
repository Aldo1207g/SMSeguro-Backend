import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Oculta la cabecera X-Powered-By: Express
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Cabeceras de seguridad en todas las respuestas (sin paquetes externos)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // Swagger UI (/docs) usa scripts y estilos propios: con la CSP estricta se vería roto
    const csp = req.path.startsWith('/docs')
      ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'"
      : "default-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'";
    res.setHeader('Content-Security-Policy', csp);
    next();
  });

  // Habilitar CORS para que Xcode y la web puedan conectarse sin bloqueos
  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://172.16.2.66:3001'],
  });

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
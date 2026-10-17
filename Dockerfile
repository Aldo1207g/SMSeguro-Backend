# Backend NestJS (SMSeguro) - API en el puerto 3000
FROM node:20
WORKDIR /app

# Instalar dependencias (incluye devDependencies para poder compilar)
COPY package*.json ./
RUN npm ci

# Copiar el código y compilar
COPY . .
RUN npm run build

# Carpeta donde se guardan las capturas subidas
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/main"]

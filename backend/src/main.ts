import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import vault from 'node-vault';
import { execSync } from 'child_process';

async function loadVaultSecrets() {
  const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
  const vaultToken = process.env.VAULT_TOKEN || 'lexmon_root_token';
  const dbHost = process.env.DB_HOST || 'lexmon-postgres';

  const vaultClient = vault({
    apiVersion: 'v1',
    endpoint: vaultAddr,
    token:vaultToken,
  });

  try{
    console.log("Connecting to Vault to fetch application credentials");
    const db = (await vaultClient.read("secret/data/database")).data.data;
    const jwt = (await vaultClient.read("secret/data/jwt")).data.data;
    const oauth = (await vaultClient.read("secret/data/oauth")).data.data;

    process.env.DATABASE_URL = `postgresql://${db.POSTGRES_USER}:${db.POSTGRES_PASSWORD}@${dbHost}:5432/${db.POSTGRES_DB}?schema=public`;

    process.env.JWT_SECRET = jwt.JWT_SECRET;
    process.env.OAUTH_GOOGLE_CLIENT_ID = oauth.OAUTH_GOOGLE_CLIENT_ID;
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = oauth.OAUTH_GOOGLE_CLIENT_SECRET;
    process.env.OAUTH_GITHUB_CLIENT_ID = oauth.OAUTH_GITHUB_CLIENT_ID;
    process.env.OAUTH_GITHUB_CLIENT_SECRET = oauth.OAUTH_GITHUB_CLIENT_SECRET;
    process.env.OAUTH_42_CLIENT_ID = oauth.OAUTH_42_CLIENT_ID;
    process.env.OAUTH_42_CLIENT_SECRET = oauth.OAUTH_42_CLIENT_SECRET;

    console.log("Vault secrets sucessfully injected from enviroment memory.");

    console.log("Synchronizing database schema with Prisma...");
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log("Database schema is fully synchronized and up to date!");
  }
  catch (error:any){
    console.error("Critical error loading secrets from Vault: ", error.message);
    process.exit(1);
  }
}

async function bootstrap() {

  await loadVaultSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {prefix: '/uploads'});
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'https://localhost',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

void bootstrap();

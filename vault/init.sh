#!/bin/sh

echo "Waiting for Vault to start"
while ! vault status > /dev/null 2>&1; do
    sleep 1
done
echo "Vault is up and running"
echo "Configuring KV Secrets engine(v2)..."

if ! vault secrets list -format=json | grep -q '"secret/"'; then
    vault secrets enable -path=secret -version=2 kv
fi

#inject secrets

vault kv put secret/database \
    POSTGRES_USER="$POSTGRES_USER" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    POSTGRES_DB="$POSTGRES_DB"

vault kv put secret/jwt \
    JWT_SECRET="$JWT_SECRET"

vault kv put secret/oauth \
    OAUTH_GOOGLE_CLIENT_ID="$OAUTH_GOOGLE_CLIENT_ID" \
    OAUTH_GOOGLE_CLIENT_SECRET="$OAUTH_GOOGLE_CLIENT_SECRET" \
    OAUTH_GITHUB_CLIENT_ID="$OAUTH_GITHUB_CLIENT_ID" \
    OAUTH_GITHUB_CLIENT_SECRET="$OAUTH_GITHUB_CLIENT_SECRET" \
    OAUTH_42_CLIENT_ID="$OAUTH_42_CLIENT_ID" \
    OAUTH_42_CLIENT_SECRET="$OAUTH_42_CLIENT_SECRET"

echo "Vault initialization complete"

#!/bin/sh

echo "Waiting for Vault to start"
while ! vault status > dev/null 2>&1; do
    sleep 1
done
echo "Vault is up and running"


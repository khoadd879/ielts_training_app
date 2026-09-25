#!/bin/bash
# Wrapper to start backend dev with RABBITMQ_URL pointing to localhost.
# Works around .env being read-only and the docker hostname 'rabbitmq'
# not resolving on the host.
cd "$(dirname "$0")"
export RABBITMQ_URL="amqp://guest:guest@127.0.0.1:5672"
exec npm run dev

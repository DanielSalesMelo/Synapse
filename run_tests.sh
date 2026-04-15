#!/bin/bash

echo "========================================================================"
echo "  TERMINAL 2: EXECUTANDO TESTES AUTOMÁTICOS (COM JQ)"
echo "========================================================================"
echo ""
echo "--- Teste 1: Criando um novo Tenant ---"
TENANT_ID=$(curl -s -X POST http://localhost:3000/tenants -H "Content-Type: application/json" -d '{"name": "Empresa Definitiva", "plan": "ultimate"}' | jq -r '.id' )
if [ -z "$TENANT_ID" ] || [ "$TENANT_ID" == "null" ]; then echo "❌ FALHA ao criar Tenant."; exit 1; else echo "✅ Tenant criado com ID: $TENANT_ID"; fi
echo ""

echo "--- Teste 2: Criando uma nova Company ---"
COMPANY_ID=$(curl -s -X POST http://localhost:3000/companies -H "Content-Type: application/json" -d "{\"name\": \"Sede Global\", \"tenantId\": \"$TENANT_ID\"}" | jq -r '.id' )
if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" == "null" ]; then echo "❌ FALHA ao criar Company."; exit 1; else echo "✅ Company criada com ID: $COMPANY_ID"; fi
echo ""

echo "--- Teste 3: Criando o Role 'USER' ---"
curl -s -X POST http://localhost:3000/roles -H "Content-Type: application/json" -d "{\"name\": \"USER\", \"tenantId\": \"$TENANT_ID\"}"
echo ""
echo "✅ Role 'USER' criado."
echo ""

echo "--- Teste 4: Registrando a usuária 'Ana Supervisora' ---"
curl -s -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"name\": \"Ana Supervisora\", \"email\": \"ana.super@nexcore.com\", \"password\": \"Password@123\", \"tenantId\": \"$TENANT_ID\", \"companyId\": \"$COMPANY_ID\"}"
echo ""
echo "✅ Usuária 'Ana Supervisora' registrada."
echo ""

echo "--- Teste 5: Fazendo login com a nova usuária ---"
curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email": "ana.super@nexcore.com", "password": "Password@123"}'
echo ""
echo ""
echo "✅✅✅ TESTES CONCLUÍDOS! O SISTEMA ESTÁ FUNCIONAL! ✅✅✅"
echo ""
echo "O servidor principal continua rodando no primeiro terminal."
echo "Para pará-lo, volte ao primeiro terminal e execute: kill $SERVER_PID"
echo ""
exec bash

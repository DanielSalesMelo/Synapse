import os
import postgres

db_url = "postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway"

try:
    sql = postgres.connect(db_url)
    print("Conectado ao banco de dados.")
    
    # Adicionar colunas manualmente
    sql.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" text;')
    print("Coluna 'lastName' adicionada ou já existente.")
    
    sql.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS "phone" varchar(20);')
    print("Coluna 'phone' adicionada ou já existente.")
    
    sql.close()
    print("Migração concluída com sucesso.")
except Exception as e:
    print(f"Erro durante a migração: {e}")

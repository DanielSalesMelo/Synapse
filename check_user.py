import psycopg2

# Configurações do Banco de Dados da Railway
DATABASE_URL = "postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway"

# E-mail do Usuário a ser verificado
EMAIL = "Danielmoraessales@outlook.com.br"

def check_user():
    try:
        # Conectar ao banco de dados
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Buscar o usuário pelo e-mail
        cur.execute('SELECT id, email, name, role, status, "openId", password FROM users WHERE email = %s', (EMAIL,))
        user = cur.fetchone()
        
        if user:
            user_id, email, name, role, status, open_id, password = user
            print("\n" + "="*50)
            print("USUÁRIO ENCONTRADO NO BANCO:")
            print(f"ID: {user_id}")
            print(f"E-mail: {email}")
            print(f"Nome: {name}")
            print(f"Cargo: {role}")
            print(f"Status: {status}")
            print(f"openId: {open_id}")
            print(f"Senha Hash: {password[:10]}...")
            print("="*50)
        else:
            print(f"\nERRO: Usuário {EMAIL} NÃO encontrado no banco de dados!")
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"ERRO ao verificar usuário: {e}")

if __name__ == "__main__":
    check_user()

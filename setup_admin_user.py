import psycopg2
import bcrypt
import datetime

# Configurações do Banco de Dados da Railway
DATABASE_URL = "postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway"

# Dados do Usuário Admin de Teste
EMAIL = "admin@rotiq.com"
PASSWORD = "admin123"
NAME = "Admin Rotiq"
ROLE = "master_admin"
STATUS = "active"
LOGIN_METHOD = "local"

def setup_admin_user():
    try:
        # Conectar ao banco de dados
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Gerar hash da senha
        hashed_password = bcrypt.hashpw(PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Gerar um openId único para o usuário
        open_id = f"local_{int(datetime.datetime.now().timestamp())}_admin"
        
        # Verificar se o usuário já existe
        cur.execute('SELECT id, "openId" FROM users WHERE email = %s', (EMAIL,))
        user = cur.fetchone()
        
        if user:
            user_id, existing_open_id = user
            print(f"Usuário {EMAIL} já existe. Atualizando para Master Admin...")
            cur.execute(
                "UPDATE users SET password = %s, role = %s, status = %s, name = %s WHERE id = %s",
                (hashed_password, ROLE, STATUS, NAME, user_id)
            )
            final_open_id = existing_open_id
        else:
            print(f"Criando novo usuário Admin: {EMAIL}...")
            cur.execute(
                'INSERT INTO users (email, password, name, role, status, "openId", "loginMethod") VALUES (%s, %s, %s, %s, %s, %s, %s)',
                (EMAIL, hashed_password, NAME, ROLE, STATUS, open_id, LOGIN_METHOD)
            )
            final_open_id = open_id
            
        conn.commit()
        cur.close()
        conn.close()
        
        print("\n" + "="*50)
        print("SUCESSO: Usuário Admin configurado!")
        print(f"E-mail: {EMAIL}")
        print(f"Senha: {PASSWORD}")
        print(f"OWNER_OPEN_ID: {final_open_id}")
        print("="*50)
        
    except Exception as e:
        print(f"ERRO ao configurar Admin: {e}")

if __name__ == "__main__":
    setup_admin_user()

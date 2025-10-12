# Configuração do Google OAuth para MLEP

## 1. Configuração no Google Cloud Console

### Passo 1: Criar Projeto no Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o ID do projeto

### Passo 2: Habilitar APIs
1. Vá para "APIs & Services" > "Library"
2. Procure e habilite:
   - Google+ API (ou People API)
   - Google Identity and Access Management (IAM) API

### Passo 3: Configurar OAuth Consent Screen
1. Vá para "APIs & Services" > "OAuth consent screen"
2. Escolha "External" (para permitir qualquer conta Gmail)
3. Preencha as informações obrigatórias:
   - **App name**: MLEP - Cursos Data Lab
   - **User support email**: seu-email@gmail.com
   - **Developer contact information**: seu-email@gmail.com
4. Adicione escopos:
   - `openid`
   - `email`
   - `profile`
5. Adicione usuários de teste (opcional para desenvolvimento)

### Passo 4: Criar Credenciais OAuth 2.0
1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Escolha "Web application"
4. Configure:
   - **Name**: MLEP Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:8000` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:8000/auth/google/callback` (desenvolvimento)
     - `https://seu-dominio.com/auth/google/callback` (produção)

### Passo 5: Obter Credenciais
1. Após criar, você receberá:
   - **Client ID**: algo como `123456789-abc123.apps.googleusercontent.com`
   - **Client Secret**: algo como `GOCSPX-abc123def456`
2. **IMPORTANTE**: Mantenha o Client Secret seguro!

## 2. Configuração no Projeto MLEP

### Atualizar arquivo .env
Edite o arquivo `.env` na raiz do projeto:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
SESSION_SECRET=gere-uma-string-aleatoria-segura-aqui
APP_BASE_URL=http://localhost:8000
```

### Gerar Session Secret
Execute este comando para gerar uma chave segura:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 3. Testando a Configuração

### Verificar se está funcionando:
1. Inicie o servidor: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
2. Acesse: http://localhost:8000/login
3. Clique em "Entrar com Google"
4. Deve redirecionar para o Google OAuth

### URLs importantes:
- **Login**: http://localhost:8000/login
- **Cursos** (protegido): http://localhost:8000/cursos
- **API Status**: http://localhost:8000/api/auth/status
- **Logout**: http://localhost:8000/logout

## 4. Fluxo de Autenticação

1. **Usuário não logado** acessa `/cursos` → redirecionado para `/login`
2. **Clica "Entrar com Google"** → redirecionado para Google OAuth
3. **Autoriza no Google** → retorna para `/auth/google/callback`
4. **Backend valida** → cria sessão e redireciona para `/cursos`
5. **Usuário logado** pode acessar todos os cursos

## 5. Segurança

### Produção:
- Use HTTPS (`APP_BASE_URL=https://seu-dominio.com`)
- Gere `SESSION_SECRET` forte e único
- Configure domínio correto no Google Cloud
- Use variáveis de ambiente seguras

### Desenvolvimento:
- Mantenha credenciais no `.env` (não commite no git)
- Use `http://localhost:8000` nas configurações

## 6. Troubleshooting

### Erro "redirect_uri_mismatch":
- Verifique se a URL de callback está correta no Google Cloud
- Deve ser exatamente: `http://localhost:8000/auth/google/callback`

### Erro "access_denied":
- Usuário cancelou o login
- Normal, apenas tente novamente

### Erro "invalid_client":
- Verifique `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
- Confirme se estão corretos no `.env`

### Erro "OAuth not configured":
- Verifique se as variáveis de ambiente estão definidas
- Reinicie o servidor após alterar `.env`

## 7. Exemplo de .env Completo

```env
# Database Configuration
DATABASE_URL=sqlite:///./data/mlep.db

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# Security
SECRET_KEY=sua-chave-secreta-aqui

# External Services
DATA_LAB_URL=https://example.com/data-lab

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./data/uploads

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789
SESSION_SECRET=sua-session-secret-aleatoria-aqui
APP_BASE_URL=http://localhost:8000
```

## 8. Status da Implementação

✅ **Implementado:**
- Sistema de autenticação completo
- Login com Google OAuth 2.0
- Proteção de rotas de cursos
- Sessões seguras com cookies
- Páginas de login e perfil
- Redirecionamento automático
- Logout funcional

🔧 **Para configurar:**
- Credenciais do Google Cloud Console
- Variáveis de ambiente no `.env`

🚀 **Pronto para uso:**
- Após configurar as credenciais, o sistema está 100% funcional
- Todos os cursos ficam protegidos por login
- Interface completa de autenticação

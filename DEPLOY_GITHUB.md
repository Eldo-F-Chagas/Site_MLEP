# 🚀 GUIA DE DEPLOY DO SITE MLEP NO GITHUB

## ⚠️ **PROBLEMA IDENTIFICADO**

O site MLEP é uma aplicação **FastAPI (Python)** que precisa de um servidor backend rodando. O **GitHub Pages** só serve arquivos estáticos, então não funciona diretamente.

## ✅ **SOLUÇÕES DISPONÍVEIS**

### **1. 🔧 GitHub Codespaces (RECOMENDADO)**

**Melhor opção para desenvolvimento e testes:**

1. **Abra o repositório no GitHub**
2. **Clique em "Code" → "Codespaces" → "Create codespace"**
3. **Aguarde a inicialização automática**
4. **No terminal do Codespace, execute:**
   ```bash
   ./start.sh
   ```
5. **Acesse o site na porta 8000 (será aberta automaticamente)**

**Credenciais de teste:**
- Email: `test@mlep.com`
- Senha: `TestPassword123`

---

### **2. 🌐 Deploy em Plataforma Cloud (PRODUÇÃO)**

#### **Opção A: Railway (Gratuito)**
1. Acesse [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Deploy automático com `railway.json` configurado

#### **Opção B: Render (Gratuito)**
1. Acesse [render.com](https://render.com)
2. Conecte seu repositório GitHub
3. Deploy automático com `render.yaml` configurado

#### **Opção C: Vercel (Gratuito)**
1. Acesse [vercel.com](https://vercel.com)
2. Conecte seu repositório GitHub
3. Deploy automático com `vercel.json` configurado

---

### **3. 🐳 Docker Local**

**Para rodar localmente com Docker:**

```bash
# Build da imagem
docker build -t mlep-site .

# Executar container
docker run -p 8000:8000 mlep-site
```

---

### **4. 🖥️ Execução Local**

**Para rodar diretamente na máquina:**

```bash
# Instalar dependências
pip install -r requirements.txt

# Executar script de inicialização
./start.sh

# OU executar manualmente
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔧 **CONFIGURAÇÕES CRIADAS**

### **Arquivos de Configuração:**
- `.devcontainer/devcontainer.json` - Configuração do Codespaces
- `.github/workflows/deploy.yml` - CI/CD automático
- `railway.json` - Deploy no Railway
- `vercel.json` - Deploy no Vercel
- `render.yaml` - Deploy no Render
- `start.sh` - Script de inicialização

### **Funcionalidades Incluídas:**
- ✅ Inicialização automática do banco de dados
- ✅ Criação de usuário de teste
- ✅ Configuração de portas para acesso externo
- ✅ Variáveis de ambiente configuradas
- ✅ Deploy automático via GitHub Actions

---

## 🎯 **RECOMENDAÇÃO**

**Para acesso imediato via GitHub:**
1. **Use GitHub Codespaces** (mais fácil e rápido)
2. **Execute `./start.sh`** no terminal
3. **Acesse o site na porta 8000**

**Para produção:**
1. **Deploy no Railway ou Render** (gratuito e fácil)
2. **Configure as variáveis de ambiente**
3. **Site ficará disponível 24/7**

---

## 🚨 **POR QUE GITHUB PAGES NÃO FUNCIONA**

- GitHub Pages = apenas arquivos estáticos (HTML, CSS, JS)
- MLEP Site = aplicação Python com banco de dados
- Precisa de servidor rodando para:
  - Autenticação de usuários
  - Banco de dados SQLite
  - APIs dinâmicas
  - Processamento backend

---

## 📞 **SUPORTE**

Se tiver problemas:
1. Verifique se todas as dependências estão instaladas
2. Confirme que a porta 8000 está disponível
3. Execute `python create_test_user.py` se o login não funcionar
4. Verifique os logs do servidor para erros

**O site está pronto para deploy em qualquer plataforma cloud!** 🎉

# Site MLEP

Site institucional e plataforma de cursos do grupo MLEP (Machine Learning Applied to Environmental Physics). O projeto combina um frontend multipágina, uma API FastAPI, autenticação local e persistência SQLAlchemy.

## Execução local

Requisitos: Node.js 22+ e Python 3.12+.

```bash
npm ci
npm run build
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.run
```

A aplicação estará em `http://localhost:8000` e a documentação da API em `http://localhost:8000/api/docs`.

Para desenvolvimento do frontend com recarga automática:

```bash
npm run dev
```

O Vite usa a API local em `http://localhost:8000` como proxy.

## Configuração

Copie `.env.example` para `.env` e altere, no mínimo, `SESSION_SECRET`. Em produção, a aplicação se recusa a iniciar com o segredo de desenvolvimento.

- `DATABASE_URL`: SQLite local ou PostgreSQL com `postgresql+psycopg://...`.
- `SESSION_SECRET`: segredo aleatório e privado, com pelo menos 32 caracteres recomendado.
- `ENVIRONMENT`: use `production` na hospedagem.
- `ALLOWED_ORIGINS`: origens CORS separadas por vírgula.
- `DATA_LAB_URL`: URL do Data Lab; o padrão aponta para `/cursos`.
- `AUTO_CREATE_TABLES`: cria o esquema no início; padrão `true`.
- `ADMIN_STATS_TOKEN`: token separado exigido por `/api/contact/stats` no cabeçalho `X-Admin-Token`.
- `SEED_DEMO_DATA`: conteúdo demonstrativo opcional; permanece desativado por padrão.

## Qualidade

```bash
npm run lint
npm audit --audit-level=high
npm run build
pytest -q
```

A integração contínua executa todas essas verificações. Falhas não são ignoradas.

## Implantação

- `Dockerfile`: imagem completa, com build do frontend e execução da API.
- `docker-compose.yml`: aplicação e PostgreSQL para ambiente local/integrado.
- `render.yaml`: serviço Docker e banco PostgreSQL gerenciado.
- `railway.json`: build pelo Dockerfile e health check em `/api/health`.
- GitHub Pages: prévia **somente estática** das páginas públicas. Autenticação, formulários, cursos e dados dinâmicos exigem a implantação da API em Render, Railway ou infraestrutura equivalente.

No provedor escolhido, configure `SESSION_SECRET`, `DATABASE_URL`, `ENVIRONMENT=production` e a origem pública em `ALLOWED_ORIGINS`.

## Segurança e conteúdo

As rotas privadas do LMS exigem sessão válida; respostas de autenticação e API usam `Cache-Control: no-store`. Redirecionamentos de login são restritos a caminhos locais, mutações entre origens são rejeitadas e os pontos de entrada mais sensíveis têm limitação básica de frequência.

Dados institucionais não confirmados e conteúdo fictício não são publicados como fatos. Cadastre publicações, projetos, equipe e notícias no banco somente após validação pelos responsáveis do grupo.

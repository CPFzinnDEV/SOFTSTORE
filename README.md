# Software Marketplace

Um marketplace navegável em React para venda e aluguel de software (produtos digitais: binários, instaladores, pacotes, plugins, zips, etc.) com integração Stripe, autenticação JWT, upload S3 e dashboard de vendedor.

## 🚀 Características

- **Autenticação**: Registro/login com roles (buyer, seller, admin), verificação de email, refresh tokens
- **Dashboard do Vendedor**: Criar/editar produtos com upload seguro para S3 usando presigned URLs
- **Catálogo Público**: Lista de produtos com filtros (venda/aluguel, tags, faixa de preço)
- **Checkout**: Integração com Stripe para capturar pagamentos
- **Pós-Pagamento**: Webhook processa pagamento, gera license key e presigned GET URL
- **Aluguel**: Controle de acesso ao download durante o período alugado
- **Payouts**: Suporte a Stripe Connect para repasse direto ao vendedor
- **Painel Admin**: Visualizar vendas, bloquear produtos, ajustar taxa da plataforma
- **Relatórios**: Vendas por período, faturamento bruto, taxas da plataforma

## 🛠️ Stack Técnico

### Frontend
- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- tRPC (client)

### Backend
- Node.js + TypeScript
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB

### Integrações
- **Pagamentos**: Stripe + Stripe Connect
- **Storage**: Amazon S3 (presigned URLs)
- **Email**: SendGrid
- **Autenticação**: JWT + Manus OAuth

## 📋 Pré-requisitos

- Node.js 18+
- pnpm
- MySQL/TiDB database
- Conta Stripe (desenvolvimento e produção)
- AWS S3 bucket
- SendGrid API key (opcional, para emails)

## 🔧 Instalação Local

### 1. Clone e instale dependências

```bash
git clone <repository-url>
cd software-marketplace
pnpm install
```

### 2. Configure variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/software_marketplace"

# JWT
JWT_SECRET="seu-secret-key-super-seguro"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CLIENT_ID="ca_..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="seu-bucket"
AWS_REGION="us-east-1"

# Email
SENDGRID_API_KEY="SG...."

# URLs
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"

NODE_ENV="development"
```

### 3. Configure o banco de dados

```bash
# Criar banco de dados
mysql -u root -p -e "CREATE DATABASE software_marketplace;"

# Executar migrations
pnpm db:push
```

### 4. Inicie o servidor de desenvolvimento

```bash
# Terminal 1: Backend
pnpm dev:server

# Terminal 2: Frontend
pnpm dev:client
```

O frontend estará disponível em `http://localhost:5173`
O backend estará disponível em `http://localhost:3000`

## 📚 Documentação da API

### Autenticação

#### POST `/api/auth/register`
Criar nova conta

```json
{
  "email": "user@example.com",
  "password": "senha123",
  "role": "buyer" // ou "seller"
}
```

#### POST `/api/auth/login`
Fazer login

```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

Resposta:
```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### Produtos

#### POST `/api/trpc/products.create`
Criar novo produto (seller only)

```json
{
  "title": "Meu Software",
  "description": "Descrição longa...",
  "summary": "Resumo curto",
  "priceSaleCents": 9999,
  "priceRentCents": 999,
  "rentPeriodDays": 30,
  "tags": ["productivity", "tool"],
  "version": "1.0.0",
  "licenseType": "MIT"
}
```

#### GET `/api/trpc/products.list`
Listar produtos publicados

Query parameters:
- `skip`: número de produtos a pular (default: 0)
- `take`: número de produtos a retornar (default: 20)
- `type`: "sale" ou "rent" (opcional)

#### GET `/api/trpc/products.get?input={id}`
Obter detalhes de um produto

### Compras

#### POST `/api/trpc/purchases.createCheckout`
Criar sessão de checkout

```json
{
  "productId": 1,
  "type": "sale" // ou "rent"
}
```

Resposta:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### GET `/api/trpc/purchases.myPurchases`
Obter compras do usuário (autenticado)

#### GET `/api/trpc/purchases.getDownloadUrl?input={purchaseId}`
Obter URL de download para uma compra (autenticado)

### Vendedor

#### GET `/api/trpc/seller.stats`
Obter estatísticas do vendedor (seller only)

Resposta:
```json
{
  "productCount": 5,
  "totalRevenue": 1234.56,
  "totalFees": 123.45,
  "recentTransactions": [...]
}
```

#### POST `/api/trpc/seller.startOnboarding`
Iniciar onboarding Stripe Connect (seller only)

Resposta:
```json
{
  "url": "https://connect.stripe.com/..."
}
```

## 🔐 Segurança

- Não armazenar dados de cartão (usar Stripe Checkout/Elements)
- S3 com política de objetos privados; presigned URLs com expiração curta
- Proteção contra reuso de links (rotacionar s3_key por produto+purchase)
- Verificação de IP e assinatura nas rotas de webhook
- JWT com refresh tokens para autenticação

## 🚀 Deploy

### Vercel (Frontend + Backend)

1. Conecte seu repositório GitHub ao Vercel
2. Configure variáveis de ambiente no painel Vercel
3. Deploy automático em cada push

### AWS (Backend)

1. Use AWS Lambda + API Gateway
2. Configure RDS para MySQL
3. Configure S3 bucket para uploads

### Netlify (Frontend)

1. Conecte seu repositório GitHub
2. Configure build command: `pnpm build:client`
3. Deploy automático

## 📊 Fluxo de Pagamento

1. **Frontend** solicita criação de Checkout Session ao backend
2. **Backend** cria Checkout Session no Stripe com `application_fee_amount` para taxa da plataforma
3. **Usuário** completa pagamento no Stripe Checkout
4. **Webhook** `checkout.session.completed` é acionado
5. **Backend** marca compra como paga, gera license key, cria presigned GET URL
6. **Email** é enviado ao comprador com link de download e license key
7. **Dashboard** exibe compra em "Meus Downloads"

## 🔄 Fluxo de Aluguel

1. Mesmo fluxo de pagamento acima
2. **Backend** define `endDate` = `startDate` + `rentPeriodDays`
3. **Download** só é permitido se `NOW()` estiver dentro de `[startDate, endDate]`
4. Após expiração, acesso é automaticamente bloqueado

## 📧 Emails Transacionais

O sistema envia emails em:
- Confirmação de registro
- Verificação de email
- Confirmação de compra
- Link de download + license key
- Notificações de vendedor

Configure SendGrid API key para ativar.

## 🧪 Testes

### Teste local com Stripe CLI

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Fazer login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Simular evento
stripe trigger payment_intent.succeeded
```

### Teste de fluxo completo

1. Criar conta como seller
2. Criar produto com upload de arquivo
3. Publicar produto
4. Fazer login como buyer
5. Comprar produto
6. Verificar email com link de download
7. Fazer download usando presigned URL

## 📝 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string MySQL | `mysql://user:pass@localhost/db` |
| `JWT_SECRET` | Secret para assinar JWTs | `super-secret-key` |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar webhooks | `whsec_...` |
| `STRIPE_CLIENT_ID` | Client ID para Stripe Connect | `ca_...` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `AWS_S3_BUCKET` | Nome do bucket S3 | `my-bucket` |
| `AWS_REGION` | Região AWS | `us-east-1` |
| `SENDGRID_API_KEY` | API key SendGrid | `SG....` |
| `FRONTEND_URL` | URL do frontend | `http://localhost:5173` |
| `BACKEND_URL` | URL do backend | `http://localhost:3000` |
| `NODE_ENV` | Ambiente | `development` |

## 🐛 Troubleshooting

### Erro: "Stripe API key not configured"
- Verifique se `STRIPE_SECRET_KEY` está definido em `.env.local`
- Certifique-se de usar a chave de teste (começa com `sk_test_`)

### Erro: "Database connection failed"
- Verifique se MySQL está rodando
- Confirme `DATABASE_URL` está correto
- Execute `pnpm db:push` para criar tabelas

### Erro: "S3 upload failed"
- Verifique credenciais AWS
- Confirme bucket existe e está acessível
- Verifique permissões IAM

### Webhooks não funcionam localmente
- Use `stripe listen` para encaminhar webhooks
- Verifique `STRIPE_WEBHOOK_SECRET` está correto
- Confira logs do backend

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato em support@example.com.


<!---
aksara:true
-->

# Prepare 
npm install @types/jsonwebtoken @types/uuid argon2 jsonwebtoken uuid zod
git clone https://github.com/Ak-sara/sso.git
npm install

version: '3.8'

services:
  oauth-server:
    build: .
    ports:
      - "5173:5173"
    environment:
      - JWT_SECRET=your-production-secret-key
      - JWT_ISSUER=https://your-domain.com
    volumes:
      - .:/app
      - /app/node_modules

  # Optional: Add PostgreSQL for production
  # postgres:
  #   image: postgres:15
  #   environment:
  #     POSTGRES_DB: oauth_server
  #     POSTGRES_USER: oauth_user
  #     POSTGRES_PASSWORD: oauth_password
  #   ports:
  #     - "5432:5432"
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data

# volumes:
#   postgres_data:

// Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

// README.md
# OIDC OAuth Server

A complete OpenID Connect (OIDC) and OAuth 2.0 server implementation built with SvelteKit.

## Features

- **Full OAuth 2.0 Authorization Code Flow**
- **OpenID Connect (OIDC) Support**
- **PKCE (Proof Key for Code Exchange) Support**
- **JWT ID Tokens**
- **Refresh Token Support**
- **Admin Panel for User/Client Management**
- **Well-Known Discovery Endpoints**
- **Responsive UI with Tailwind CSS**

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Admin Panel**
   - Go to `http://localhost:5173/admin`
   - Create a user and OAuth client

## Endpoints

### Discovery
- `GET /.well-known/openid_configuration` - OIDC discovery document

### OAuth 2.0 / OIDC
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint  
- `GET /oauth/userinfo` - UserInfo endpoint

### Admin
- `GET /admin` - Admin panel for managing users and clients

## Usage Example

1. **Create a client** in the admin panel
2. **Redirect users** to authorization endpoint:
   ```
   /oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK&scope=openid email
   ```
3. **Exchange authorization code** for tokens:
   ```bash
   curl -X POST /oauth/token \
     -d "grant_type=authorization_code" \
     -d "code=AUTHORIZATION_CODE" \
     -d "redirect_uri=YOUR_CALLBACK" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET"
   ```
4. **Get user info** with access token:
   ```bash
   curl -H "Authorization: Bearer ACCESS_TOKEN" /oauth/userinfo
   ```

## Security Features

- Secure password hashing with Argon2
- JWT tokens with expiration
- PKCE support for public clients
- Authorization code expiration (10 minutes)
- Refresh token rotation
- Client secret validation

## Production Deployment

1. **Update Environment Variables**
   - Set strong `JWT_SECRET`
   - Update `JWT_ISSUER` to your domain
   - Enable HTTPS

2. **Use Production Database**
   - Replace in-memory storage with PostgreSQL/MySQL
   - Implement proper connection pooling

3. **Security Hardening**
   - Enable HTTPS only
   - Set secure cookie flags
   - Implement rate limiting
   - Add CORS headers

4. **Monitoring**
   - Add logging
   - Implement health checks
   - Monitor token usage

## License

BSD-License

# Secure Configuration Management

A cloud security project that demonstrates how to securely manage application configuration and secrets using **Microsoft Azure Key Vault**, **Managed Identity**, **Azure RBAC**, **Azure App Service**, and **GitHub Actions**.

The application automatically retrieves sensitive configuration values from Azure Key Vault when the server starts. Secret values are never stored in the source code, GitHub repository, or exposed to the browser.

---

## Project Overview

Modern applications often require sensitive configuration values such as:

- Database passwords
- API keys
- Application secrets
- Authentication credentials

Storing these values directly in source code or configuration files can create serious security risks.

This project solves that problem by storing sensitive configuration in **Azure Key Vault** and retrieving it securely at runtime.

The same application supports multiple environments:

- Development
- Staging
- Production

Each environment uses its own Azure Key Vault.

---

## Main Objectives

The project demonstrates:

- Secure storage of secrets in Azure Key Vault
- No secrets stored in source code
- Passwordless authentication
- Automatic configuration loading during application startup
- Separate Key Vaults for development, staging, and production
- Azure RBAC for access control
- System-assigned Managed Identity for Azure App Service
- GitHub Actions CI/CD
- OIDC authentication between GitHub and Azure
- Automatic deployment to Azure App Service
- Safe frontend status display without exposing secret values

---

## Architecture

The application follows this flow:

```text
APP_ENV
   |
   v
development / staging / production
   |
   v
Select corresponding Azure Key Vault
   |
   v
DefaultAzureCredential
   |
   +--> Azure CLI authentication locally
   |
   +--> Managed Identity in Azure App Service
   |
   v
Load secrets from Azure Key Vault
   |
   v
Store configuration in server memory
   |
   v
GET /api/config-status
   |
   v
Frontend displays only loading status
```

Secret values are never returned to the browser.

---

## Azure Resources

The project uses the following Azure resources:

### Resource Group

```text
rg-secure-config
```

### Key Vaults

```text
kv-secure-config-dev
kv-secure-config-staging
kv-secure-config-prod
```

Each Key Vault contains the same secret names:

```text
DatabasePassword
ApiKey
AppSecret
```

The values are different for each environment.

### Azure App Service

```text
secure-config-gr13-app
```

Runtime:

```text
Node.js 24 LTS
Linux
```

Region:

```text
France Central
```

---

## Environment Selection

The environment is controlled through the `APP_ENV` environment variable.

Supported values:

```text
development
staging
production
```

The application automatically selects the correct Key Vault.

```javascript
const vaults = {
  development: "https://kv-secure-config-dev.vault.azure.net/",
  staging: "https://kv-secure-config-staging.vault.azure.net/",
  production: "https://kv-secure-config-prod.vault.azure.net/"
};

const KEY_VAULT_URL = vaults[APP_ENV];
```

This allows the same source code to work in all environments.

---

## Authentication

The application uses:

```javascript
DefaultAzureCredential
```

from the `@azure/identity` package.

### Local Development

Locally, authentication is performed using Azure CLI:

```bash
az login
```

`DefaultAzureCredential` automatically uses the authenticated Azure CLI account.

### Azure App Service

In Azure, the application uses a:

```text
System-assigned Managed Identity
```

No username, password, client secret, or access key is stored in the application.

---

## Azure RBAC

The App Service Managed Identity receives the following role on the production Key Vault:

```text
Key Vault Secrets User
```

This role allows the application to read secrets from:

```text
kv-secure-config-prod
```

The permission is granted using Azure Role-Based Access Control.

---

## Secrets

The following secrets are used:

| Secret | Purpose |
|---|---|
| `DatabasePassword` | Example database authentication secret |
| `ApiKey` | Example external API key |
| `AppSecret` | Example internal application secret |

The values are never returned by the API or displayed in the browser.

The frontend only displays:

```text
Loaded successfully
```

or:

```text
Not loaded
```

---

## Project Structure

```text
secure-config-project/
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
│
├── public/
│   ├── index.html
│   └── style.css
│
└── .github/
    └── workflows/
        ├── deploy.yml
        └── main_secure-config-gr13-app.yml
```

---

## Technologies Used

- Microsoft Azure
- Azure Key Vault
- Azure App Service
- Azure Managed Identity
- Azure RBAC
- Microsoft Entra ID
- Node.js
- Express.js
- Azure Identity SDK
- Azure Key Vault Secrets SDK
- HTML
- CSS
- JavaScript
- Git
- GitHub
- GitHub Actions
- OpenID Connect (OIDC)
- Azure CLI
- Visual Studio Code

---

## Required Node.js Packages

The application uses:

```json
{
  "@azure/identity": "^4.14.1",
  "@azure/keyvault-secrets": "^4.12.0",
  "dotenv": "^18.0.9",
  "express": "^5.3.0"
}
```

Install all dependencies with:

```bash
npm install
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/erzamerovcii/secure-config-project.git
```

Open the project:

```bash
cd secure-config-project
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Login to Azure

```bash
az login
```

Select the Azure subscription used by the project.

---

### 4. Create `.env`

Create a file named:

```text
.env
```

For development:

```env
APP_ENV=development
```

For staging:

```env
APP_ENV=staging
```

The `.env` file must never be pushed to GitHub.

It is excluded through `.gitignore`.

---

### 5. Start the application

```bash
npm start
```

The application runs locally at:

```text
http://localhost:3000
```

---

## Production Configuration

In Azure App Service, the following environment variable is configured:

```text
APP_ENV=production
```

The application therefore automatically connects to:

```text
kv-secure-config-prod
```

Azure App Service automatically provides the application port through:

```text
process.env.PORT
```

The application uses:

```javascript
const PORT = process.env.PORT || 3000;
```

---

## Automatic Secret Loading

Configuration is automatically loaded when the server starts.

```javascript
async function startServer() {
  configurationStatus = await loadConfiguration();

  app.listen(PORT, () => {
    console.log(`Environment: ${APP_ENV}`);
    console.log(`Application running at http://localhost:${PORT}`);
  });
}
```

Secrets are loaded in parallel using:

```javascript
Promise.all()
```

Example:

```javascript
const results = await Promise.all([
  loadSecret("DatabasePassword"),
  loadSecret("ApiKey"),
  loadSecret("AppSecret")
]);
```

This means the application does not wait for one secret before starting to retrieve the next one.

---

## Individual Secret Error Handling

Each secret is handled separately.

```javascript
async function loadSecret(name) {
  try {
    const secret = await client.getSecret(name);

    return {
      name,
      loaded: true,
      value: secret.value
    };
  } catch (error) {
    console.error(`Failed to load ${name}:`, error.message);

    return {
      name,
      loaded: false,
      value: null
    };
  }
}
```

If one secret is missing, the application can still report the status of the remaining secrets.

---

## Configuration Status API

The application exposes:

```text
GET /api/config-status
```

Example production response:

```json
{
  "success": true,
  "allLoaded": true,
  "environment": "production",
  "secrets": [
    {
      "name": "DatabasePassword",
      "status": "Loaded successfully",
      "loaded": true
    },
    {
      "name": "ApiKey",
      "status": "Loaded successfully",
      "loaded": true
    },
    {
      "name": "AppSecret",
      "status": "Loaded successfully",
      "loaded": true
    }
  ]
}
```

The API does **not** return secret values.

---

## Frontend

The frontend displays:

- Cloud platform
- Key Vault service
- Authentication method
- Active environment
- Configuration status
- Individual secret loading status

Example:

```text
Platform
Microsoft Azure

Service
Azure Key Vault

Authentication
Azure Identity

Environment
Production
```

Secret values are never displayed.

---

## CI/CD with GitHub Actions

The project contains two GitHub Actions workflows.

### CI Workflow

```text
deploy.yml
```

The CI workflow:

- Runs on changes to the project
- Checks out the repository
- Sets up Node.js
- Installs dependencies
- Verifies that the project can be built

---

### Azure Deployment Workflow

```text
main_secure-config-gr13-app.yml
```

This workflow automatically deploys the application to:

```text
secure-config-gr13-app
```

when changes are pushed to:

```text
main
```

The deployment workflow:

1. Checks out the repository
2. Sets up Node.js
3. Installs dependencies
4. Creates the deployment package
5. Authenticates to Azure with OIDC
6. Deploys the application to Azure App Service

---

## OIDC Authentication

GitHub Actions authenticates to Azure using:

```text
OpenID Connect (OIDC)
```

A User-assigned Managed Identity is used for deployment:

```text
github-deploy-secure-config
```

This removes the need to store an Azure password or long-lived client secret in GitHub.

GitHub uses identifiers such as:

```text
Client ID
Tenant ID
Subscription ID
```

for the federated authentication configuration.

---

## Two Different Managed Identities

The project uses two identities for different purposes.

### System-assigned Managed Identity

Attached directly to:

```text
secure-config-gr13-app
```

Purpose:

```text
App Service -> Azure Key Vault
```

It has the role:

```text
Key Vault Secrets User
```

---

### User-assigned Managed Identity

```text
github-deploy-secure-config
```

Purpose:

```text
GitHub Actions -> Azure App Service
```

It is used by the CI/CD deployment workflow through OIDC.

These two identities have different responsibilities.

---

## GitHub Actions Deployment Flow

```text
Developer
   |
   | git push
   v
GitHub Repository
   |
   v
GitHub Actions
   |
   | OIDC
   v
User-assigned Managed Identity
   |
   v
Azure App Service
   |
   | System-assigned Managed Identity
   v
Azure Key Vault
   |
   v
Application configuration
```

---

## Security Features

### No Secrets in Source Code

Sensitive values are stored only in Azure Key Vault.

### No Secrets in GitHub

The Key Vault secret values never pass through GitHub Actions.

### Managed Identity

The application authenticates without storing credentials.

### Azure RBAC

Access is controlled using Azure roles.

### Environment Separation

Development, staging, and production use separate Key Vaults.

### Server-side Secret Access

Secret values remain on the server.

### Safe Frontend

The frontend receives only configuration status.

---

## `.gitignore`

The project should include:

```gitignore
node_modules/
.env
```

This prevents dependencies and local environment configuration from being pushed to GitHub.

---

## Environments

| Environment | APP_ENV | Azure Key Vault | Authentication |
|---|---|---|---|
| Development | `development` | `kv-secure-config-dev` | Azure CLI |
| Staging | `staging` | `kv-secure-config-staging` | Azure CLI / Managed Identity |
| Production | `production` | `kv-secure-config-prod` | App Service Managed Identity |

---

## Testing

### Development Test

Run:

```env
APP_ENV=development
```

Then:

```bash
az login
npm start
```

Expected result:

```text
Environment: Development
DatabasePassword: Loaded successfully
ApiKey: Loaded successfully
AppSecret: Loaded successfully
```

---

### Production Test

Azure App Service is configured with:

```text
APP_ENV=production
```

Expected result:

```text
Environment: Production
Azure Key Vault configuration loaded successfully.

DatabasePassword: Loaded successfully
ApiKey: Loaded successfully
AppSecret: Loaded successfully
```

---

## Deployment Troubleshooting

During deployment, several issues were tested and resolved.

### Application starts as a static site

If Azure starts:

```text
default-static-site.js
```

instead of the Node.js server, configure the startup command as:

```text
npm start
```

---

### Missing `server.js`

Verify the deployed files under:

```text
/home/site/wwwroot
```

The directory should contain:

```text
server.js
package.json
package-lock.json
public/
```

---

### Missing Node.js dependencies

If an error such as this appears:

```text
Cannot find module 'dotenv'
```

install dependencies:

```bash
npm install
```

The deployment pipeline should package or install the required dependencies before the application starts.

---

### Key Vault Access Error

Verify:

```text
App Service
-> Identity
-> System assigned
-> On
```

Then verify the production Key Vault:

```text
kv-secure-config-prod
-> Access control (IAM)
```

The App Service Managed Identity must have:

```text
Key Vault Secrets User
```

---

## Live Application

Production application:

https://secure-config-gr13-app-cyfpd5fadmcegeb3.francecentral-01.azurewebsites.net/

---

## GitHub Repository

Source code:

https://github.com/erzamerovcii/secure-config-project

---

## Project Results

The final application successfully demonstrates:

- Secure secret storage using Azure Key Vault
- Development, staging, and production separation
- Automatic configuration loading
- Azure Managed Identity
- Azure RBAC
- Local authentication with Azure CLI
- Passwordless Azure authentication
- GitHub Actions CI/CD
- OIDC deployment authentication
- Automatic deployment to Azure App Service
- Production application successfully loading all three secrets

The application therefore satisfies the requirements of the **Secure Configuration Management** laboratory project.

---

## Authors

Project developed as part of the course:

**Menaxhimi i Burimeve në Cloud Computing**

University of Prishtina “Hasan Prishtina”  
Computer and Software Engineering

Group members:

- Anjeza Sfishta
- Erza Merovci
- Fortesa Cena

Professor:

**Artan Mazrekaj**

---

## References

- Microsoft Azure Key Vault documentation
- Microsoft Azure App Service documentation
- Microsoft Azure Managed Identity documentation
- Microsoft Azure RBAC documentation
- Microsoft Azure Identity SDK for JavaScript
- GitHub Actions documentation
- OWASP Secrets Management Cheat Sheet

---

## License

This project was created for educational purposes.
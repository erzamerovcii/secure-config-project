require("dotenv").config();

const express = require("express");
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const app = express();

const PORT = process.env.PORT || 3000;
const KEY_VAULT_URL = process.env.KEY_VAULT_URL;
const APP_ENV = process.env.APP_ENV || "development";

app.use(express.static("public"));

if (!KEY_VAULT_URL) {
  console.error("KEY_VAULT_URL is missing.");
  process.exit(1);
}

const credential = new DefaultAzureCredential();
const client = new SecretClient(KEY_VAULT_URL, credential);

const configuration = {
  DatabasePassword: null,
  ApiKey: null,
  AppSecret: null,
};

async function loadSecret(name) {
  try {
    const secret = await client.getSecret(name);

    return {
      name,
      loaded: true,
      value: secret.value,
    };
  } catch (error) {
    console.error(`Failed to load ${name}:`, error.message);

    return {
      name,
      loaded: false,
      value: null,
    };
  }
}

async function loadConfiguration() {
  console.log(`Loading configuration for ${APP_ENV}...`);

  const results = await Promise.all([
    loadSecret("DatabasePassword"),
    loadSecret("ApiKey"),
    loadSecret("AppSecret"),
  ]);

  results.forEach((secret) => {
    configuration[secret.name] = secret.value;
  });

  return results;
}

let configurationStatus = [];

app.get("/api/config-status", (req, res) => {
  const allLoaded = configurationStatus.every((secret) => secret.loaded);

  const atLeastOneLoaded = configurationStatus.some((secret) => secret.loaded);

  res.json({
    success: atLeastOneLoaded,

    allLoaded: allLoaded,

    environment: APP_ENV,

    secrets: configurationStatus.map((secret) => ({
      name: secret.name,

      status: secret.loaded ? "Loaded successfully" : "Not loaded",

      loaded: secret.loaded,
    })),
  });
});

async function startServer() {
  configurationStatus = await loadConfiguration();

  app.listen(PORT, () => {
    console.log(`Environment: ${APP_ENV}`);
    console.log(`Application running at http://localhost:${PORT}`);
  });
}

startServer();

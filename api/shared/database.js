const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

// Get connection info from environment variables
const accountName = process.env.AZURE_STORAGE_ACCOUNT;
const accountKey = process.env.AZURE_STORAGE_KEY;

let activitiesClient = null;
let signupsClient = null;
let unavailableClient = null;

function getActivitiesClient() {
    if (!activitiesClient) {
        if (!accountName || !accountKey) {
            throw new Error("Azure Storage credentials not configured");
        }
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const url = `https://${accountName}.table.core.windows.net`;
        activitiesClient = new TableClient(url, "activities", credential);
    }
    return activitiesClient;
}

function getSignupsClient() {
    if (!signupsClient) {
        if (!accountName || !accountKey) {
            throw new Error("Azure Storage credentials not configured");
        }
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const url = `https://${accountName}.table.core.windows.net`;
        signupsClient = new TableClient(url, "signups", credential);
    }
    return signupsClient;
}

function getUnavailableClient() {
    if (!unavailableClient) {
        if (!accountName || !accountKey) {
            throw new Error("Azure Storage credentials not configured");
        }
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const url = `https://${accountName}.table.core.windows.net`;
        unavailableClient = new TableClient(url, "unavailable", credential);
    }
    return unavailableClient;
}

// Initialize tables (create if not exists)
async function initializeTables() {
    try {
        await getActivitiesClient().createTable();
    } catch (e) {
        if (e.statusCode !== 409) throw e; // 409 = table exists
    }
    try {
        await getSignupsClient().createTable();
    } catch (e) {
        if (e.statusCode !== 409) throw e;
    }
    try {
        await getUnavailableClient().createTable();
    } catch (e) {
        if (e.statusCode !== 409) throw e;
    }
}

module.exports = {
    getActivitiesClient,
    getSignupsClient,
    getUnavailableClient,
    initializeTables
};

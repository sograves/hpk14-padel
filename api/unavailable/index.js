const { getUnavailableClient, initializeTables } = require("../shared/database");

module.exports = async function (context, req) {
    try {
        await initializeTables();

        if (req.method === "POST") {
            return await addUnavailable(context, req);
        } else if (req.method === "DELETE") {
            return await removeUnavailable(context, req);
        }

        context.res = { status: 405, body: "Method not allowed" };
    } catch (error) {
        context.log.error("Error in unavailable API:", error);
        context.res = {
            status: 500,
            body: { error: "Internal server error" }
        };
    }
};

async function addUnavailable(context, req) {
    const { activityId, name } = req.body || {};

    if (!activityId || !name) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: activityId, name" }
        };
        return;
    }

    const unavailableClient = getUnavailableClient();

    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entity = {
        partitionKey: activityId,
        rowKey: id,
        name: name.trim(),
        markedAt: new Date().toISOString()
    };

    await unavailableClient.createEntity(entity);

    context.res = {
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: { id, name: name.trim(), markedAt: entity.markedAt }
    };
}

async function removeUnavailable(context, req) {
    const { activityId, unavailableId } = req.body || {};

    if (!activityId || !unavailableId) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: activityId, unavailableId" }
        };
        return;
    }

    const unavailableClient = getUnavailableClient();

    try {
        await unavailableClient.deleteEntity(activityId, unavailableId);
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { success: true }
        };
    } catch (e) {
        if (e.statusCode === 404) {
            context.res = {
                status: 404,
                body: { error: "Entry not found" }
            };
            return;
        }
        throw e;
    }
}

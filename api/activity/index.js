const { getActivitiesClient, getSignupsClient, getUnavailableClient, initializeTables } = require("../shared/database");
const { requireTeamCode } = require("../shared/auth");

module.exports = async function (context, req) {
    try {
        await initializeTables();

        const activityId = req.query.id;

        if (!activityId) {
            context.res = {
                status: 400,
                body: { error: "Activity ID is required" }
            };
            return;
        }

        if (req.method === "GET") {
            return await getActivity(context, activityId);
        } else if (req.method === "PUT") {
            if (!requireTeamCode(context, req)) return;
            return await updateActivity(context, activityId, req);
        } else if (req.method === "DELETE") {
            if (!requireTeamCode(context, req)) return;
            return await deleteActivity(context, activityId);
        }

        context.res = { status: 405, body: "Method not allowed" };
    } catch (error) {
        context.log.error("Error in activity API:", error);
        context.res = {
            status: 500,
            body: { error: "Internal server error" }
        };
    }
};

async function getActivity(context, activityId) {
    const activitiesClient = getActivitiesClient();
    const signupsClient = getSignupsClient();
    const unavailableClient = getUnavailableClient();

    let activity;
    try {
        const entity = await activitiesClient.getEntity("activity", activityId);
        activity = {
            id: entity.rowKey,
            name: entity.name,
            type: entity.type,
            date: entity.date,
            location: entity.location,
            maxParticipants: entity.maxParticipants,
            description: entity.description,
            createdAt: entity.createdAt
        };
    } catch (e) {
        if (e.statusCode === 404) {
            context.res = {
                status: 404,
                body: { error: "Activity not found" }
            };
            return;
        }
        throw e;
    }

    // Get signups (available)
    const signups = [];
    const signupEntities = signupsClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${activityId}'` }
    });

    for await (const entity of signupEntities) {
        signups.push({
            id: entity.rowKey,
            name: entity.name,
            signedUpAt: entity.signedUpAt
        });
    }
    signups.sort((a, b) => new Date(a.signedUpAt) - new Date(b.signedUpAt));

    // Get unavailable
    const unavailable = [];
    const unavailableEntities = unavailableClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${activityId}'` }
    });

    for await (const entity of unavailableEntities) {
        unavailable.push({
            id: entity.rowKey,
            name: entity.name,
            markedAt: entity.markedAt
        });
    }
    unavailable.sort((a, b) => new Date(a.markedAt) - new Date(b.markedAt));

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { activity, signups, unavailable }
    };
}

async function updateActivity(context, activityId, req) {
    const { name, type, date, location, maxParticipants, description } = req.body || {};

    if (!name || !type || !date || !location) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: name, type, date, location" }
        };
        return;
    }

    const activitiesClient = getActivitiesClient();

    try {
        const existing = await activitiesClient.getEntity("activity", activityId);

        const entity = {
            partitionKey: "activity",
            rowKey: activityId,
            name: name,
            type: type,
            date: date,
            location: location,
            maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
            description: description || null,
            createdAt: existing.createdAt
        };

        await activitiesClient.updateEntity(entity, "Replace");

        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { id: activityId, ...entity }
        };
    } catch (e) {
        if (e.statusCode === 404) {
            context.res = {
                status: 404,
                body: { error: "Activity not found" }
            };
            return;
        }
        throw e;
    }
}

async function deleteActivity(context, activityId) {
    const activitiesClient = getActivitiesClient();
    const signupsClient = getSignupsClient();

    try {
        await activitiesClient.deleteEntity("activity", activityId);

        // Also delete all signups for this activity
        const signupEntities = signupsClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${activityId}'` }
        });

        for await (const entity of signupEntities) {
            await signupsClient.deleteEntity(activityId, entity.rowKey);
        }

        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { success: true }
        };
    } catch (e) {
        if (e.statusCode === 404) {
            context.res = {
                status: 404,
                body: { error: "Activity not found" }
            };
            return;
        }
        throw e;
    }
}

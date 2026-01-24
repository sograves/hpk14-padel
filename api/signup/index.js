const { getActivitiesClient, getSignupsClient, initializeTables } = require("../shared/database");

module.exports = async function (context, req) {
    try {
        await initializeTables();

        if (req.method === "POST") {
            return await addSignup(context, req);
        } else if (req.method === "DELETE") {
            return await removeSignup(context, req);
        }

        context.res = { status: 405, body: "Method not allowed" };
    } catch (error) {
        context.log.error("Error in signup API:", error);
        context.res = {
            status: 500,
            body: { error: "Internal server error" }
        };
    }
};

async function addSignup(context, req) {
    const { activityId, name } = req.body || {};

    if (!activityId || !name) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: activityId, name" }
        };
        return;
    }

    const activitiesClient = getActivitiesClient();
    const signupsClient = getSignupsClient();

    // Verify activity exists and check max participants
    let activity;
    try {
        activity = await activitiesClient.getEntity("activity", activityId);
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

    // Check if already at max participants
    if (activity.maxParticipants) {
        let count = 0;
        const signups = signupsClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${activityId}'` }
        });
        for await (const _ of signups) {
            count++;
        }
        if (count >= activity.maxParticipants) {
            context.res = {
                status: 400,
                body: { error: "Activity is full" }
            };
            return;
        }
    }

    // Generate unique ID for signup
    const signupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entity = {
        partitionKey: activityId,
        rowKey: signupId,
        name: name.trim(),
        signedUpAt: new Date().toISOString()
    };

    await signupsClient.createEntity(entity);

    context.res = {
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: { id: signupId, name: name.trim(), signedUpAt: entity.signedUpAt }
    };
}

async function removeSignup(context, req) {
    const { activityId, signupId } = req.body || {};

    if (!activityId || !signupId) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: activityId, signupId" }
        };
        return;
    }

    const signupsClient = getSignupsClient();

    try {
        await signupsClient.deleteEntity(activityId, signupId);
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { success: true }
        };
    } catch (e) {
        if (e.statusCode === 404) {
            context.res = {
                status: 404,
                body: { error: "Signup not found" }
            };
            return;
        }
        throw e;
    }
}

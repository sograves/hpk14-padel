const { getActivitiesClient, getSignupsClient, initializeTables } = require("../shared/database");

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

        const activitiesClient = getActivitiesClient();
        const signupsClient = getSignupsClient();

        // Get the activity
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

        // Get signups for this activity
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

        // Sort signups by signup time
        signups.sort((a, b) => new Date(a.signedUpAt) - new Date(b.signedUpAt));

        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: { activity, signups }
        };
    } catch (error) {
        context.log.error("Error in activity API:", error);
        context.res = {
            status: 500,
            body: { error: "Internal server error" }
        };
    }
};

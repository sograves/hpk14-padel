const { getActivitiesClient, getSignupsClient, getUnavailableClient, initializeTables } = require("../shared/database");
const { requireTeamCode } = require("../shared/auth");

module.exports = async function (context, req) {
    try {
        await initializeTables();

        if (req.method === "GET") {
            return await getActivities(context);
        } else if (req.method === "POST") {
            if (!requireTeamCode(context, req)) return;
            return await createActivity(context, req);
        }

        context.res = { status: 405, body: "Method not allowed" };
    } catch (error) {
        context.log.error("Error in activities API:", error);
        context.res = {
            status: 500,
            body: { error: "Internal server error" }
        };
    }
};

async function getActivities(context) {
    const activitiesClient = getActivitiesClient();
    const signupsClient = getSignupsClient();
    const unavailableClient = getUnavailableClient();

    // Get all activities
    const activities = [];
    const entities = activitiesClient.listEntities({
        queryOptions: { filter: "PartitionKey eq 'activity'" }
    });

    for await (const entity of entities) {
        activities.push({
            id: entity.rowKey,
            name: entity.name,
            type: entity.type,
            date: entity.date,
            location: entity.location,
            maxParticipants: entity.maxParticipants,
            description: entity.description,
            createdAt: entity.createdAt
        });
    }

    // Get signup and unavailable counts for each activity
    for (const activity of activities) {
        let signupCount = 0;
        const signups = signupsClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${activity.id}'` }
        });
        for await (const _ of signups) {
            signupCount++;
        }
        activity.signupCount = signupCount;

        let unavailableCount = 0;
        const unavailable = unavailableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${activity.id}'` }
        });
        for await (const _ of unavailable) {
            unavailableCount++;
        }
        activity.unavailableCount = unavailableCount;
    }

    // Sort by date (upcoming first)
    activities.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filter to only show future activities (or activities from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingActivities = activities.filter(a => new Date(a.date) >= today);

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: upcomingActivities
    };
}

async function createActivity(context, req) {
    const { name, type, date, location, maxParticipants, description } = req.body || {};

    // Validate required fields
    if (!name || !type || !date || !location) {
        context.res = {
            status: 400,
            body: { error: "Missing required fields: name, type, date, location" }
        };
        return;
    }

    const activitiesClient = getActivitiesClient();

    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entity = {
        partitionKey: "activity",
        rowKey: id,
        name: name,
        type: type,
        date: date,
        location: location,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        description: description || null,
        createdAt: new Date().toISOString()
    };

    await activitiesClient.createEntity(entity);

    context.res = {
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: { id, ...entity }
    };
}

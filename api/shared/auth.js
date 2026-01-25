// Simple team code authentication

const TEAM_CODE = process.env.TEAM_CODE || "hpk14";

function validateTeamCode(req) {
    const providedCode = req.headers['x-team-code'];
    return providedCode === TEAM_CODE;
}

function requireTeamCode(context, req) {
    if (!validateTeamCode(req)) {
        context.res = {
            status: 401,
            headers: { "Content-Type": "application/json" },
            body: { error: "Invalid team code" }
        };
        return false;
    }
    return true;
}

module.exports = {
    validateTeamCode,
    requireTeamCode
};

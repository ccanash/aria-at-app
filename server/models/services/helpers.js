const {
    At,
    AtMode,
    AtVersion,
    Browser,
    BrowserVersion,
    Role,
    TestPlanVersion,
    TestPlanReport,
    TestPlanRun,
    TestPlanTarget,
    User,
    UserRoles
} = require('../index');

/**
 * Use to retrieve all the attributes defined for a Sequelize model
 * @param {Model} model - Sequelize model
 * @returns {string[]}
 */
const getSequelizeModelAttributes = model => {
    if (!model) throw new Error('Model not defined');

    return Object.keys(model.rawAttributes).map(key => key);
};

module.exports = {
    getSequelizeModelAttributes,
    AT_ATTRIBUTES: getSequelizeModelAttributes(At),
    AT_MODE_ATTRIBUTES: getSequelizeModelAttributes(AtMode),
    AT_VERSION_ATTRIBUTES: getSequelizeModelAttributes(AtVersion),
    BROWSER_ATTRIBUTES: getSequelizeModelAttributes(Browser),
    BROWSER_VERSION_ATTRIBUTES: getSequelizeModelAttributes(BrowserVersion),
    ROLE_ATTRIBUTES: getSequelizeModelAttributes(Role),
    TEST_PLAN_VERSION_ATTRIBUTES: getSequelizeModelAttributes(TestPlanVersion),
    TEST_PLAN_REPORT_ATTRIBUTES: getSequelizeModelAttributes(TestPlanReport),
    TEST_PLAN_RUN_ATTRIBUTES: getSequelizeModelAttributes(TestPlanRun),
    TEST_PLAN_TARGET_ATTRIBUTES: getSequelizeModelAttributes(TestPlanTarget),
    USER_ATTRIBUTES: getSequelizeModelAttributes(User),
    USER_ROLES_ATTRIBUTES: getSequelizeModelAttributes(UserRoles)
};

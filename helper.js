// imports
const constants      = require("./constants.js");

// shorter alias for module.exports
const e = module.exports;

e.permissionsToInt = (permissionsList) => {
    // if we recieved a list of permissions, turn them into an integer
    if (Array.isArray(permissionsList)) {
        let permissions = 0;
        permissionsList.forEach(p => {
            permissions |= p;
        });
        return permissions;
    }

    if (Number.isInteger(permissionsList)) {
        // we recieved an integer permission
        return permissionsList;
    }

    throw new Error("Could not process list of permissions. "
        + `Must be an array or integer, recieved '${permissionsList}'.`);
};

e.rolesToPermissions = (rolesMap) => {
    // if we recieved a list of roles, turn them into a list of permissions
    if (rolesMap instanceof Map) {
        const permissionsList = [];

        // loop through the roles and add permissions
        Object.values(constants.roles).forEach(role => {
            if (rolesMap.has(role.id)) {
                permissionsList.push(...role.permissions);
            }
        });

        // return array, without duplicates
        return [...new Set(permissionsList)];
    }

    if (typeof rolesMap === "string") {
        // we recieved a single role
        return constants.roles.find(x => x.id === rolesMap).roles;
    }

    throw new Error("Could not process Map of roles. "
        + `Must be a Map or role id string, recieved '${rolesMap}'.`);
};

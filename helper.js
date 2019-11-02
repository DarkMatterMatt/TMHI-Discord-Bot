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

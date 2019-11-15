/** Configuration secrets, including login credentials */
module.exports = {
    // database login credentials
    database: {
        host:         "localhost",
        database:     "myDb",
        user:         "myUser",
        password:     "myPassword",
    },

    // discord bot login token
    bot_token: "myToken_0NTuhfAq4gzg3OTE.Tk4MjY.gwMz_2Ktdse0Z66THVtgbgExBT5",

    // documentation home page
    documentation_url: `https://mattm.win/tmhi/discordbot/docs/${process.env.npm_package_version}/`,

    // command documentation
    command_documentation_url: `https://mattm.win/tmhi/discordbot/docs/${process.env.npm_package_version}/{{command}}`,
};

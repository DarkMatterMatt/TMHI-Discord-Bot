# TMHI-Discord-Bot
Custom Discord bot for the TMHI Discord server

## Commands
_TODO_: lots more commands to add, in [CommandManager](src/CommandManager.js).

Commands are displayed with the default prefix `!`. All parameters are
positional. Required parameters `<param>`, optional parameters `[param]`.

```
!createPermission <id> <name> <comment>
!createPermission FREE_DRINKS 'Free Drinks' 'Eligible for free drinks when we meet'
```
Create a new permission that a role can provide.

```
!grantRolePermission <role> <permissionId> <comment>
!grantRolePermission @Mods FREE_DRINKS 'Moderators drink free!'
```
Grants a permission to a role. `<role>` can be an @mention or a role id.

## Contributing, Modifying the Code and Adding Features

First, clone this repository to your machine.

```sh
git clone https://github.com/Tri-Mark-Heavy-Industries/TMHI-Discord-Bot.git
```

Next, create a new branch (appropriately named, such as `fix-typo` or
`add-ai`) from the `dev` branch, and checkout this new branch.

```sh
git checkout -b <branch name> dev
```

Perform the changes you want and commit them to git. We recommend you name your
commit messages using an imperative present tense for consistency, such as
"_Add name validation_" instead of "_This commit added a feature_".

```sh
git add <file>
git commit
```

Finally, push your branch to this repository, submit a pull request,
and get someone else to approve the pull request.

```sh
git push
```

Once the pull request is approved and merged into the `dev` branch, your job
is complete, and the changes you have made will be present in the next release.

### Testing

There are no automated tests for this small program. If you are making
large changes, you may want to test your changes on your own Discord
server first. The next section describes how you could run it locally.

## Setting Up

This program requires the following information to run:

1. a Discord bot token so the bot can login to our Discord server
2. a MySQL or MariaDB database for the bot to store data in

### Prerequisite Software

1. Install NodeJS.
2. Install program dependencies by running `npm install` from the repository
   folder. Ignore Discord.js's warnings about missing peer dependencies.
3. Install MySQL or [MariaDB](https://downloads.mariadb.org/) (recommended).

### Step 1. Getting the Discord Bot Token

An existing Discord Bot in an existing Discord Application has already
been made for TMHI. You will need to _create your own Discord Bot_ to test your
changes on _your own testing server_.

1. Go to https://discordapp.com/developers/applications
2. Create a new application, and give it an appropriate name.
3. Go to the Bot page from the navigation sidebar.
4. Create a bot.
5. Give it a nice username to the bot.
6. **Copy the bot token**, you will need it later.
7. Go to the OAuth2 tab from the navigation sidebar.
8. Under the "URL Generator":
    - Select the "bot" checkbox, after which the "Bot Permissions" panel
      becomes visible.
    - Under Bot Permissions > Text Permissions, select "Send Messages".
9. Navigate to the generated URL to add your new Discord Bot to the server.

### Step 2. Creating a Database

The following commands are for MariaDB 10 on Windows 10. MariaDB is a drop-in
replacement for MySQL, so the command `mysql` will run MariaDB if available.

1. Open a terminal / Command Prompt / Powershell window.
2. Start an interactive MariaDB session by running `mysql -u root -p`
3. Create the database, `CREATE DATABASE myDb;`
4. Set the newly created database as active, `USE myDb;`
5. Create a new user to access your database,
   `CREATE USER 'myUser'@'localhost' IDENTIFIED BY 'myPassword';`
6. Grant the newly created user permissions to your new database,
   `GRANT ALL PRIVILEGES ON myDb.* TO 'myUser'@'localhost';`

### Running Locally

Create a copy of `secrets.example.js` called `secrets.js`. Modify `secrets.js`
with the bot token from [Step 1](#step-1-getting-the-discord-bot-token) and the database connection details from [Step 2](#step-2-creating-a-database).

Then run `npm start` to start the bot.

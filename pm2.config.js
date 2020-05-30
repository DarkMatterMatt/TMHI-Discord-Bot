module.exports = {
    apps: [{
        name:   "TMHI-Discord-Bot",
        script: "npm",
        args:   "start",
        cwd:    "GIT_DIR/",

        // Options reference: https://doc.pm2.io/en/runtime/reference/ecosystem-file/
        instances:          1,
        autorestart:        true,
        watch:              ["src"],
        watch_delay:        1000,
        max_memory_restart: "1G",
        max_restarts:       4,
        min_uptime:         "30s",
        env:                {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        },
    }],
};

INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_CHANNEL',          'Greeting Channel',         "",     'The channel to greet new members in');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_MESSAGE',          'Greeting Message',         "",     'The message to greet new members with');
ALTER TABLE guildsettings MODIFY value VARCHAR(8192);

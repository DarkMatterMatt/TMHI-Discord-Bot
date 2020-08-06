UPDATE settings SET defaultvalue='Welcome {{member}}'                  WHERE id='GREETING_MESSAGE';
UPDATE settings SET defaultvalue='{{member}} ({{tag}}) left :cry:'     WHERE id='LEAVING_MESSAGE';
UPDATE settings SET defaultvalue='Starting initiation for {{member}}!' WHERE id='INITIATE_MESSAGE';

INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('CONCLUDE_ROLE',                 'Conclude Role',                '',                                         'The role to grant to new members');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('CONCLUDE_MESSAGE',              'Conclude Message',             'Initiation for {{member}} is complete!',   'The message to greet members with');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_ROLE',                'Squadless Role',               '',                                         'The role to grant to new members without a squad');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_MESSAGE',             'Squadless Message',            '{{member}} needs a squad!',                'The message to post to the squadless channel');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_CHANNEL',             'Squadless Channel',            '',                                         'The channel to post the squadless message into');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('VERIFIED_ROLE',                 'Verified Role',                '',                                         'The role someone needs to be able to get the member role');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_LOG_CHANNEL',       'Recruitment Log Channel',      '',                                         'The channel that will log all the actions performed by recruitment officers');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_INITIATE_MESSAGE',  'Recruitment Initiate Message', 'initiate | {{author}} | {{member}}',       'The initate message log that will be psoted to the recruitment log channel');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_CONCLUDE_MESSAGE',  'Recruitment Conclude Message', 'conclude | {{author}} | {{member}}',       'The conclude message log that will be posted to the recruitment log channel');

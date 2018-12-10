const db = require('./db');
const app = require('express').Router();
const bcrypt = require('bcrypt');
const validate = require('./utils/validate');
const moment = require('moment');
const cryptoJS = require('crypto-js');
const sgMail = require('@sendgrid/mail');
const error = require('./utils/error-handler');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post('/api/auth/register', (req, resp) => {
    if (req.body.agreed) {
        if (req.body.legal) {
            if (!validate.usernameCheck.test(req.body.username)) {
                resp.send({status: 'error', statusMessage: 'Invalid username'});
            } else if (req.body.password !== req.body.confirmPassword) {
                resp.send({status: 'error', statusMessage: 'Passwords do not match'});
            } else if (!validate.passwordCheck.test(req.body.password)) {
                resp.send({status: 'error', statusMessage: 'Passwords too short or long'});
            } else if (req.body.email !== req.body.confirmEmail) {
                resp.send({status: 'error', statusMessage: 'Emails do not match'});
            } else if (!validate.emailCheck.test(req.body.email)) {
                resp.send({status: 'error', statusMessage: 'Invalid email format'});
            } else if (!validate.nameCheck.test(req.body.firstName)) {
                resp.send({status: 'error', statusMessage: 'Invalid first name'});
            } else if (!validate.nameCheck.test(req.body.lastName)) {
                resp.send({status: 'error', statusMessage: 'Invalid last name'});
            } else if (validate.blankCheck.test(req.body.firstName)) {
                resp.send({status: 'error', statusMessage: 'First name cannot be blank'});
            } else if (validate.blankCheck.test(req.body.lastName)) {
                resp.send({status: 'error', statusMessage: 'Last name cannot be blank'});
            } else if (validate.blankCheck.test(req.body.country)) {
                resp.send({status: 'error', statusMessage: 'Please select a country'});
            } else if (validate.blankCheck.test(req.body.region)) {
                resp.send({status: 'error', statusMessage: 'Please select a region'});
            } else if (validate.blankCheck.test(req.body.city)) {
                resp.send({status: 'error', statusMessage: 'Please enter your city name'});
            } else {
                bcrypt.hash(req.body.password, 10, (err, result) => {
                    if (err) { error.log({name: err.name, message: err.message, origin: 'bcrypt Unhashing', url: req.url}); }

                    db.connect((err, client, done) => {
                        if (err) error.log({name: err.name, message: err.message, origin: 'Database Connection', url: '/'});
                        
                        (async() => {
                            try {
                                await client.query(`BEGIN`);

                                let encrypted = cryptoJS.AES.encrypt(req.body.email, 'registering for m-ploy');
                                let registrationKey = encrypted.toString();

                                let user = await client.query(`INSERT INTO users (username, user_password, user_email, account_type, registration_key) VALUES ($1, $2, $3, $4, $5) RETURNING user_id`, [req.body.username, result, req.body.email, req.body.accountType, registrationKey]);

                                await client.query(`INSERT INTO user_profiles (user_profile_id, user_firstname, user_lastname, user_country, user_region, user_city, user_title) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [user.rows[0].user_id, req.body.firstName, req.body.lastName, req.body.country, req.body.region, req.body.city, req.body.title]);
                                await client.query(`INSERT INTO user_settings (user_setting_id) VALUES ($1)`, [user.rows[0].user_id]);

                                let message = {
                                    to: req.body.email,
                                    from: 'support@m-ploy.org',
                                    subject: 'Welcome to Mploy',
                                    templateId: 'd-4994ab4fd122407ea5ba295506fc4b2a',
                                    dynamicTemplateData: {
                                        url: 'localhost:9999',
                                        regkey: registrationKey
                                    },
                                    trackingSettings: {
                                        clickTracking: {
                                            enable: false
                                        }
                                    }
                                }

                                sgMail.send(message)
                                .catch(err => console.log(err.response.body.errors));

                                await client.query(`COMMIT`)
                                .then(() => resp.send({status: 'success', statusMessage: 'Registration successful. Please check your email to confirm your account'}));
                            } catch (e) {
                                await client.query(`ROLLBACK`);
                                throw e;
                            } finally {
                                done();
                            }
                        })()
                        .catch(err => {
                            error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url});
                            
                            let message = `An error occurred`;
                            
                            if (err.code === '23505') {
                                if (err.constraint === 'unique_email') {
                                    message = 'Email already taken';
                                } else if (err.constraint === 'unique_username') {
                                    message = 'Username already taken';
                                }
                            } else if (err.code === '23502') {
                                message = 'All fields are required';
                            }

                            resp.send({status: 'error', statusMessage: message});
                        });
                    });
                });
            }
        } else {
            resp.send({status: 'error', statusMessage: 'You must be 18 years or older'});
        }
    } else {
        resp.send({status: 'error', statusMessage: 'You must agree to the terms of service'});
    }
});

app.post('/api/auth/login', async(req, resp, next) => {
    if (req.session.user) {
        next();
    } else {
        db.connect((err, client, done) => {
            if (err) error.log({name: err.name, message: err.message, origin: 'Database Connection', url: '/'});

            (async() => {
                try {
                    await client.query('BEGIN');

                    let auth = await client.query(`SELECT * FROM users WHERE username = $1`, [req.body.username]);
                   
                    // If user exists
                    if (auth && auth.rows.length === 1) {
                        // Get user's ban date and today's date
                        let banEndDate = await client.query(`SELECT ban_end_date FROM user_bans WHERE banned_user = $1 ORDER BY ban_id DESC LIMIT 1`, [req.body.username]);
                        let today = new Date();
                        // If user is banned, deny access
                        if (auth.rows[0].user_status === 'Ban') {
                            let error = new Error(`Your account has been permanently banned`);
                            error.type = 'CUSTOM';
                            error.status = 'access error';
                            throw error;
                        // if users haven't activated their account
                        } else if (auth.rows[0].user_status === 'Pending') {
                            let error = new Error(`You need to activate your account`);
                            error.type = 'CUSTOM';
                            error.status = 'error';
                            throw error;
                        // If user is temporarily banned, check if today is after ban date. If it is, set user status to 'Active'
                        } else if (auth.rows[0].user_status === 'Suspend') {
                            if (today >= banEndDate) {
                                await client.query(`UPDATE users SET user_status = 'Active' WHERE username = $1`, [req.body.username]);
                            }
                        }

                        // Compare password
                        bcrypt.compare(req.body.password, auth.rows[0].user_password, async(err, match) => {
                            if (err) error.log({name: err.name, message: err.message, origin: 'bcrypt Comparing', url: req.url});

                            if (match) {
                                await client.query(`UPDATE users SET user_last_login = $1, user_this_login = current_timestamp WHERE user_id = $2`, [auth.rows[0].user_this_login, auth.rows[0].user_id])
                                .catch(err => error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url}));

                                let session = {
                                    user_id: auth.rows[0].user_id,
                                    username: auth.rows[0].username,
                                    accountType: auth.rows[0].account_type,
                                    userLevel: auth.rows[0].user_level
                                }

                                req.session.user = session;
                                
                                await client.query('COMMIT')
                                .then(() => next());
                            } else {
                                let error = new Error('Incorrect username or password');
                                error.type = 'CUSTOM';
                                error.status = 'error';
                                throw error;
                            }
                        });
                    } else {
                        client.query('ROLLBACK');
                        next();
                    }    
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    done();
                }
            })()
            .catch(err => {
                error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url});
                
                let message = 'An error occurred';
                let errorStatus = 'error';

                if (err.type === 'CUSTOM') {
                    errorStatus = err.status;
                    message = err.message;
                }

                resp.send({status: errorStatus, statusMessage: message});
            });
        }); 
    }
},
async(req, resp) => {
    if (req.session.user) {
        let user = await db.query(`SELECT users.user_id, users.username, users.user_email, users.user_last_login, users.account_type, user_profiles.*, user_settings.* FROM users
        LEFT JOIN user_profiles ON users.user_id = user_profiles.user_profile_id
        LEFT JOIN user_settings ON users.user_id = user_settings.user_setting_id
        WHERE users.user_id = $1`, [req.session.user.user_id]);

        if (user && user.rows.length === 1) {
            delete user.rows[0].user_id;
            
            resp.send({status: 'get session success', user: user.rows[0]});
        } else {
            resp.send({status: 'get session fail', statusMessage: `The user does not exist`});
        }
    } else {
        resp.send({status: 'get session fail', statusMessage: `You're not logged in`});
    }
});

app.post('/api/auth/logout', (req, resp) => {
    req.session = null;

    resp.send({status: 'logged out'});
});

module.exports = app;
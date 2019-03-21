require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const session = require('cookie-session');
const controller = require('./modules/utils/controller');
const server = http.createServer(app);
const db = require('./modules/db');
const cryptoJS = require('crypto-js');
const sgMail = require('@sendgrid/mail');
const error = require('./modules/utils/error-handler');
const request = require('request');
let port = process.env.PORT;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.set('view engine', 'pug');
app.set('views', ['dist', 'dist/inc']);
//app.set('trust proxy', 'loopback');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({
    verify: function(req, resp, buffer) {
        let url = req.originalUrl;

        if (url.startsWith('/stripe-webhooks')) {
            req.rawBody = buffer.toString();
        }
    }
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    maxAge: 8.64e+7
}));

app.use(function (req, res, next) {
    req.session.nowInMinutes = Math.floor(Date.now() / 60e3)
    next();
});

app.use(express.static('dist'));
app.use('/fonts', express.static('dist/fonts'));
app.use('/styles', express.static('dist/css'));
app.use('/user_files', express.static(`user_files`))
app.use('/images', express.static('dist/images'));

app.use(/^\/(?!\/admin-panel).*/, async(req, resp, next) => {
    let status = await db.query(`SELECT config_status FROM site_configs WHERE config_name = 'Site'`);

    if (status.rows[0].config_status === 'Active') {
        next();
    } else {
        resp.render('offline', {header: 'Site Offline', message: 'Hire World has been brought down for maintenance, please check back later'});
    }
});

app.use(/^\/api\/(?!admin).*/, async(req, resp, next) => {
    let status = await db.query(`SELECT config_status FROM site_configs WHERE config_name = 'Site'`);

    if (status.rows[0].config_status === 'Active') {
        next();
    } else {
        resp.send({status: 'error', statusMessage: 'Site is offline'});
    }
});

app.use(require('./modules/auth'));

app.use(require('./modules/user/user'));
app.use(require('./modules/user/settings'));
app.use(require('./modules/user/review'));
app.use(require('./modules/user/listings'));
app.use(require('./modules/user/reports'));

app.use(require('./modules/fetch/sectors'));
app.use(require('./modules/fetch/user'));
app.use(require('./modules/fetch/messages'));
app.use(require('./modules/fetch/jobs'));
app.use(require('./modules/fetch/listings'));
app.use(require('./modules/fetch/configs'));

app.use(require('./modules/api/messages'));
app.use(require('./modules/api/jobs'));

app.get('/*', async(req, resp) => {
    /* let announcements = await db.query(`SELECT * FROM announcements`); */

    resp.sendFile(__dirname + '/dist/app.html');
});

app.post('/api/resend-confirmation', async(req, resp) => {
    request.post('https://www.google.com/recaptcha/api/siteverify', {form: {secret: process.env.RECAPTCHA_SECRET, response: req.body.verified}}, async(err, res, body) => {
        if (err) error.log(err, req, resp);

        let response = JSON.parse(res.body);

        if (response.success) {
            db.connect((err, client, done) => {
                if (err) console.log(err);

                (async() => {
                    try {
                        client.query('BEGIN');

                        let user = await client.query(`SELECT user_id, user_status FROM users WHERE user_email = $1`, [req.body.email]);

                        if (user && user.rows.length === 1 && user.rows[0].user_status === 'Pending') {
                            let encrypted = cryptoJS.AES.encrypt(req.body.email, process.env.ACTIVATE_ACCOUNT_SECRET);
                            let regKeyString = encrypted.toString();
                            let registrationKey = encodeURIComponent(regKeyString);
                            
                            let message = {
                                to: req.body.email,
                                from: 'admin@hireworld.ca',
                                subject: 'Welcome to Hire World',
                                templateId: 'd-4994ab4fd122407ea5ba295506fc4b2a',
                                dynamicTemplateData: {
                                    url: process.env.SITE_URL,
                                    regkey: registrationKey
                                },
                                trackingSettings: {
                                    clickTracking: {
                                        enable: false
                                    }
                                }
                            }
                            
                            sgMail.send(message);

                            await client.query(`UPDATE users SET registration_key = $1, reg_key_expire_date = current_timestamp + interval '1' day WHERE user_id = $2`, [regKeyString, user.rows[0].user_id])
                        }

                        await client.query('COMMIT')
                        .then(() => resp.send({status: 'success'}));
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        done();
                    }
                })()
                .catch(err => error.log(err, req, resp));
            });
        } else {
            resp.send({status: 'error', statusMessage: `You're not human`});
        }
    });
});

app.post('/api/activate-account', async(req, resp) => {
    if (req.session.user) {
        req.session = null;
    }
    
    let registrationKey = decodeURIComponent(req.body.key);

    let user = await db.query(`SELECT username, registration_key, reg_key_expire_date, user_status, user_email, user_id FROM users WHERE registration_key = $1 AND user_status = 'Pending'`, [registrationKey])

    if (user && user.rows.length === 1) {
        if (new Date(user.rows[0].reg_key_expire_date) < new Date) {
            resp.send({status: 'error', statusMessage: 'The link has expired'});
        } else {
            let decrypted = cryptoJS.AES.decrypt(registrationKey, process.env.ACTIVATE_ACCOUNT_SECRET);

            if (decrypted.toString(cryptoJS.enc.Utf8) === user.rows[0].user_email) {
                await db.query(`UPDATE users SET user_status = 'Active' WHERE user_id = $1`, [user.rows[0].user_id])
                .then(result => {
                    if (result && result.rowCount === 1) {
                        resp.send({status: 'success', statusMessage: `Your account has been activated`});
                    }
                })
            } else {
                resp.send({status: 'error', statusMessage: 'Failed to activated account. Please try again or contact an administrator.'})
            }
        }
    } else {
        resp.send({status: 'error', statusMessage: `The account requiring activation does not exist`});
    }
});

app.post('/api/forgot-password', async(req, resp) => {
    request.post('https://www.google.com/recaptcha/api/siteverify', {form: {secret: process.env.RECAPTCHA_SECRET, response: req.body.verified}}, async(err, res, body) => {
        if (err) error.log(err, req, resp);

        let response = JSON.parse(res.body);

        if (response.success) {
            controller.email.password.reset(req.body.email);
        } else {
            resp.send({status: 'error', statusMessage: `You're not human`});
        }
    });
})

/* app.get('/pricing', async(req, resp) => {
    let promo = await db.query(`SELECT * FROM promotions WHERE promo_status = 'Active'`)
    .then(result => {
        if (result) {
            return result.rows[0];
        }
    })
    .catch(err => console.log(err));

    resp.render('pricing', {promo: promo, user: req.session.user});
});

app.get('/how-it-works', (req, resp) => {
    resp.render('how', {user: req.session.user});
});

app.get('/features', (req, resp) => {
    resp.render('features', {user: req.session.user});
});

app.get('/faq', (req, resp) => {
    resp.render('faq', {user: req.session.user});
});

app.get('/register', (req, resp) => {
    if (req.session.user) {
        resp.redirect('/app');
    } else {
        resp.render('register');
    }
});

app.get('/register/success', (req, resp) => {
    resp.render('response', {header: 'Registration Successful', message: 'A verification email has been sent. Please click the link provided to activate your account.'});
});

app.get('/resend-confirmation', (req, resp) => {
    resp.render('resend');
});

app.get('/support', (req, resp) => {
    resp.render('support');
});

app.get('/about', (req, resp) => {
    resp.render('about');
});

app.get('/tos', (req, resp) => {
    resp.render('tos');
});

app.get('/privacy', (req, resp) => {
    resp.render('privacy');
});

app.get('/advertise', (req, resp) => {
    resp.render('advertise');
});

app.get('/contact', (req, resp) => {
    resp.render('contact');
});

app.post('/contact-form', (req, resp) => {
    let message = {
        to: 'admin@hireworld.ca',
        from: `${req.body.name} <${req.body.email}>`,
        subject: req.body.subject,
        text: req.body.message,
        trackingSettings: {
            clickTracking: {
                enable: false
            }
        }
    }

    sgMail.send(message)
    .then(() => resp.render('response', {header: 'Message Sent', message: 'Thank you for writing to us. If your message expects a response, we will respond as soon as we can.'}))
    .catch(err => {
        console.log(err);
        resp.render('response', {header: '500 Internal Server Error', message: 'An error occurred while trying to deliver your message. Please try again later.'});
    });
}); */

app.post('/api/site/review', (req, resp) => {
    db.query(`INSERT INTO site_review (reviewer, rating) VALUES ($1, $2)`, [req.session.user.username, req.body.stars])
    .then(result => {
        if (result && result.rowCount === 1) {
            resp.send({status: 'success'});
        } else {
            resp.send({status: 'error', statusMessage: 'Not available at this time'});
        }
    })
    .catch(err => {
        console.log(err);
        resp.send({status: 'error', statusMessage: 'An error occurred'});
    });
});

/* app.get(/^\/(app|app(\/)?.*)?/, (req, resp) => {
    resp.sendFile(__dirname + '/dist/app.html');
}); */

app.post('/api/pin', async(req, resp) => {
    if (req.session.user) {
        db.connect((err, client, done) => {
            if (err) console.log(err);

            (async() => {
                try {
                    await client.query('BEGIN');

                    let table, pinnedId, pinnedBy, pinnedDate, action, date;;

                    if (req.body.type === 'message') {
                        table = 'pinned_messages';
                        pinnedId = 'pinned_message';
                        pinnedBy = 'message_pinned_by';
                        pinnedDate = 'message_pinned_date';
                    } else if (req.body.type === 'job') {
                        table = 'pinned_jobs';
                        pinnedId = 'pinned_job';
                        pinnedBy = 'job_pinned_by';
                        pinnedDate = 'job_pinned_date';
                    }

                    let exist = await db.query(`SELECT * FROM ${table} WHERE ${pinnedId} = $1 AND ${pinnedBy} = $2`, [req.body.id, req.session.user.username]);

                    if (exist && exist.rows.length === 1) {
                        await client.query(`DELETE FROM ${table} WHERE ${pinnedId} = $1 AND ${pinnedBy} = $2`, [req.body.id, req.session.user.username]);
                        date = null;
                        action = 'delete';
                    } else if (exist && exist.rows.length === 0) {
                        date = await client.query(`INSERT INTO ${table} (${pinnedId}, ${pinnedBy}) VALUES ($1, $2) RETURNING ${pinnedDate}`, [req.body.id, req.session.user.username])
                        .then(result => {
                            return result.rows[0].pinned_date;
                        });

                        action = 'pin';
                    }

                    await client.query('COMMIT')
                    .then(() => resp.send({status: 'success', pinnedDate: date, action: action}));
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    done();
                }
            })()
            .catch(err => {
                console.log(err);
                resp.send({status: 'error', statusMessage: 'An error occurred'});
            });
        });
    }
});

app.post('/api/log-error', (req, resp) => {
    let errorObj = {stack: req.body.stack}
    error.log(errorObj, req, resp, req.body.url);
});

app.use('/api/admin', (req, resp, next) => {
    if (req.session.user) {
        db.query(`SELECT user_level FROM users WHERE username = $1`, [req.session.user.username])
        .then(result => {
            if (result.rows[0].user_level > 90) {
                next();
            } else {
                resp.send({status: 'access error', statusMessage: `You're not authorized to access this area`});
            }
        })
        .catch(err => {
            console.log(err);
            resp.send({status: 'error', statusMessage: 'An errorr occurred'});
        });
    } else {
        resp.send({status: 'error', statusMessage: `You're not logged in`});
    }
});

app.post('/api/admin/privilege', (req, resp) => {
    if (req.session.user) {
        db.query(`SELECT user_level FROM users WHERE username = $1`, [req.session.user.username])
        .then(result => {
            if (result.rows[0].user_level > 90) {
                resp.send({status: 'success'});
            } else {
                resp.send({status: 'access error', statusMessage: `You're not authorized to access this area`});
            }
        })
        .catch(err => {
            console.log(err);
            resp.send({status: 'error', statusMessage: 'An errorr occurred'});
        });
    } else {
        resp.send({status: 'error', statusMessage: `You're not authorized`});
    }
});

app.use(require('./modules/admin/overview'));
app.use(require('./modules/admin/sector'));
app.use(require('./modules/admin/users'));
app.use(require('./modules/admin/listings'));
app.use(require('./modules/admin/reports'));
app.use(require('./modules/admin/configs'));

/* app.use('/api/dev', (req, resp, next) => {
    if (req.session.user && req.session.user.userLevel > 90) {
        next();
    } else {
        resp.send({status: 'error', statusMessage: `You're not authorized`});
    }
});

app.use(require('./modules/admin/errors')); */

/* app.get('*', (req, resp) => {
    console.log('here');
    resp.sendFile(`${__dirname}/dist/index.html`);
}); */

app.use(require('./modules/webhooks'));

server.listen(port, '0.0.0.0', (err) => {
    if (err) {
        console.log(err);
        console.log(err);
    } else {
        console.log(process.env.NODE_ENV);
        console.log(`Server running on port ${port}`);
    }
});
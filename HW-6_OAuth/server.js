const express = require('express');
const axios = require('axios');
const util = require('./modules/util.js');
const handlebars = require('express-handlebars');
require('dotenv').config();

const app = express();
app.engine('handlebars', handlebars.engine({
    defaultLayout: 'default_layout'
}));
app.set('view engine', 'handlebars');

app.enable('trust proxy');
app.use(express.static('public'));
app.use(express.json());

const buildSignInLink = async (req) => {
    const request = {
        method: 'get',
        url: 'https://accounts.google.com/o/oauth2/auth',
        params: {
            response_type: 'code',
            client_id: process.env.CLIENT_ID,
            redirect_uri: util.buildRedirectURI(req),
            scope: 'https://www.googleapis.com/auth/userinfo.profile',
            state: (await util.newStateToken())
        }
    }
    return axios.getUri(request);
}

const requestToken = async (req, code) => {
    const request = {
        method: 'post',
        url: 'https://accounts.google.com/o/oauth2/token',
        params: {
            code: code,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: util.buildRedirectURI(req),
            grant_type: 'authorization_code'
        }
    }
    return await axios(request).then((response) => {
        return response.data;
    }).catch(() => {
        return null;
    });
}

const getInfo = async (token) => {
    const request = {
        method: 'get',
        url: 'https://people.googleapis.com/v1/people/me?personFields=names',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    const response = await axios(request);
    return response.data;
}

const error = (res, message) => res.render('error', {
    css: [
        'error.css'
    ],
    data: {
        error: 'Error: ' + message
    }
});

app.get('/', async (req, res) => {
    res.render('home', {
        css: ['home.css']
    });
});

app.get('/login', async (req, res) => {
    var uri = await buildSignInLink(req);
    res.redirect(uri);
});

app.get('/oauth', async (req, res) => {
    if(req.query.code && req.query.state) {
        if(await util.checkState(req.query.state)) {
            const data = await requestToken(req, req.query.code);
            if(data === null)
                error(res, 'Access refused by Google Api');
            else {
                const info = await getInfo(data.access_token);
                res.render('info', {
                    css: [
                        'info.css'
                    ],
                    data: {
                        given_name: info.names[0].givenName,
                        family_name: info.names[0].familyName,
                        state: req.query.state
                    }
                });
            }
        } else 
            error(res, 'State token expired');
    } else
        error(res, 'Request missing parameters');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server open on port: ${PORT}`);
});
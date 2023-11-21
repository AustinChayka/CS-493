const express = require('express');
const app = express();
const api = require('./routes/api.js');
const handlebars = require('express-handlebars');
require('dotenv').config();

const { auth } = require('express-openid-connect');

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: 'http://localhost:8000',
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: `https://${process.env.DOMAIN}`,
    secret: process.env.SECRET
};

app.engine('handlebars', handlebars.engine({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.enable('trust proxy');
app.use(express.static('public'));
app.use(express.json());

app.use((req, res, next) => {
    res.error = (code, message) => {
        res.status(code).json({
            'Error': message
        });
    }
    next();
});

app.use(auth(config));
app.use(api);

app.get('/', async (req, res) => {
    if(req.oidc.isAuthenticated()) {
        res.render('user_info', {
            data: {
                nickname: req.oidc.user.nickname,
                jwt: req.oidc.idToken
            },
            css: ['user_info.css']
        });
    } else
        res.render('home', {
            css: ['home.css']
        });
});

app.get('/*', (req, res) => {
    res.error(404, 'Route not found');
});

const PORT = process.env.port || 8000;
app.listen(PORT, () => {
    console.log("Server open on port: " + PORT);
});
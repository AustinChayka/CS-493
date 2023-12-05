require('dotenv').config();
const express = require('express');
const app = express();
const { auth } = require('express-openid-connect');
const handlebars = require('express-handlebars');

const URL = (process.argv.indexOf('--local') > -1) ? 'http://localhost:8080' : 'https://cs493-finalproject-406222.uw.r.appspot.com';

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: URL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: `https://${process.env.DOMAIN}`,
    secret: process.env.SECRET
};

app.engine('handlebars', handlebars.engine({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.enable('trust proxy');
app.use(auth(config));
app.use(express.static('public'));
app.use(express.json());

app.use((req, res, next) => {
    res.error = (status, message) => {
        res.status(status).json({
            'Error': message
        });
    }
    next();
})

app.use('/api', require('./api/index.js'));

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server open on port: ${PORT}`);
});
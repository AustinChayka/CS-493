const express = require('express');
const app = express();
const api = require('./routes/api.js');
const login = require('./routes/login.js');
require('dotenv').config();

app.enable('trust proxy');
app.use(express.json());

app.use((req, res, next) => {
    res.error = (code, message) => {
        res.status(code).json({
            'Error': message
        });
    }
    next();
});

app.use('/login', login);
app.use(api);

app.get('/', (req, res) => {
    res.send('Home Page');
});

app.get('/*', (req, res) => {
    res.error(404, 'Route not found');
});

const PORT = process.env.port || 8080;
app.listen(PORT, () => {
    console.log("Server open on port: " + PORT);
});
const express = require('express');
const app = express();
const boatRouter = require('./api/boat_router.js');

app.enable('trust proxy');
app.use(express.json()); 
app.use('/boats', boatRouter);

app.get('/*', (req, res) => {
    res.status(404).json({
        'Error': 'Route not found'
    });
});

const PORT = process.env.port || 8080;
app.listen(PORT, () => {
    console.log("Server open on port: " + PORT);
});
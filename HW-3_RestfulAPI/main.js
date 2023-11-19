const express = require('express');
const app = express();
const boat_router = require('./routers/boat_router.js');
const slip_router = require('./routers/slip_router.js');

app.use(express.json());

app.use('/boats', boat_router);
app.use('/slips', slip_router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, observations_config} = require('../modules/data.js');

const router = express.Router();

router.use(util.checkJWT);
router.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
        req.auth = null;
        next();
    } else {
        next(err);
    }
});

router.route('/')
    .get(async (req, res) => {
        res.status(200).send('test');
    })
    .post((req, res, next) => util.validateData(req, res, next, observations_config.property_filters), util.enforceJWT, (req, res) => {
        res.status(201).end();
    })
    .patch((req, res) => {
        res.set('Accept', 'GET, POST');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET, POST');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET, POST');
        res.error(405, 'Forbidden operation');
    })

module.exports = router;
require('dotenv').config();
const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {families_config, genera_config, species_config, observations_config, users_config} = require('../modules/data.js');
const axios = require('axios');

const checkReplaceSub = (req, res, next) => {
    if(req.params.sub === 'mine' && req.auth && req.auth.sub) req.params.sub = req.auth.sub;
    next();
}

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
        let cursor = null;
        if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
        const results = await dm.getPage(users_config.key, cursor);
        let responseJSON = {
            results: results.items
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, families_config.path + '?cursor=' + results.nextCursor);
        res.status(200).send(responseJSON);
    })
    .post((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })

router.route('/:sub/families')
    .all(checkReplaceSub)
    .get(async (req, res) => {
        let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(families_config.key, 'meta.owner', '=', req.params.sub, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, families_config.path, families_config.id_prefix + item.id));
            items.map((item) => {util.trim(item, ['meta', 'genera'])});
            let responseJSON = {
                results: items
            }
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, genera_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
    })
    .post((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })

router.route('/:sub/genera')
    .all(checkReplaceSub)
    .get(async (req, res) => {
        let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(genera_config.key, 'meta.owner', '=', req.params.sub, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id));
            items.map((item) => {util.trim(item, ['meta', 'species', 'family'])});
            let responseJSON = {
                results: items
            }
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, genera_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
    })
    .post((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })

router.route('/:sub/species')
    .all(checkReplaceSub)
    .get(async (req, res) => {
        let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(species_config.key, 'meta.owner', '=', req.params.sub, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, species_config.path, species_config.id_prefix + item.id));
            items.map((item) => {util.trim(item, ['meta', 'observations', 'genus'])});
            let responseJSON = {
                results: items
            }
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, species_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
    })
    .post((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })

router.route('/:sub/observations')
    .all(checkReplaceSub)
    .get(async (req, res) => {
        let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(observations_config.key, 'meta.owner', '=', req.params.sub, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, observations_config.path, observations_config.id_prefix + item.id));
            items = items.filter((item) => {
                return item.meta.public || (req.auth && item.meta.owner === req.auth.sub);
            });
            items.map((item) => {util.trim(item, ['meta', 'species', 'family'])});
            let responseJSON = {
                results: items
            }
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, observations_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
    })
    .post((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .put((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })
    .delete((req, res) => {
        res.set('Accept', 'GET');
        res.error(405, 'Forbidden operation');
    })

module.exports = router;
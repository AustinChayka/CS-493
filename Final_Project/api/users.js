const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {families_config, genera_config, species_config} = require('../modules/data.js');

const router = express.Router();

router.route('/:sub/families')
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

module.exports = router;
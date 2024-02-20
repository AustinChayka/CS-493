const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, observations_config, species_config} = require('../modules/data.js');

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
    .get(util.checkAccepts, async (req, res) => {
        let cursor = null;
        if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
        const results = await dm.getPage(observations_config.key, cursor);
        let items = results.items.filter((item) => {
            return item.meta.public || (req.auth && req.auth.sub === item.meta.owner);
        });
        items.map((item) => util.formatItem(item, req, observations_config.path, observations_config.id_prefix + item.id));
        items.map((item) => util.trim(item, ['meta']));
        if(Object.keys(req.query).includes('verified')) {
            if(req.query.verified === 'true') {
                items = util.filterVerified(items);
                items.map((item) => {
                    item.observations = util.filterVerified(item.observations);
                })
            }
            else if(req.query.verified !== 'false') {
                res.error(400, "query parameter 'verified' must be true or false");
                return;
            }
        }
        let responseJSON = {
            results: items
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, observations_config.path + '?cursor=' + results.nextCursor);
        res.status(200).send(responseJSON);
    })
    .post(util.checkContentType, (req, res, next) => util.validateData(req, res, next, observations_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = observations_config.constructor(req.auth.sub, req.body);
        const item_key = await dm.postItem(observations_config.key, item);
        util.formatItem(item, req, observations_config.path, observations_config.id_prefix + item_key.id)
        res.status(201).json(item);
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

router.route('/:identifier')
    .all((req, res, next) => util.checkIdentifier(req, res, next, observations_config.id_prefix, observations_config.key))
    .get(util.checkAccepts, async (req, res) => {
        const item = await dm.getItem(observations_config.key, res.locals.id);
        if(item === null) res.error(404, 'Not found');
        else if(!item.meta.public && (!req.auth || req.auth.sub !== item.meta.owner)) res.error(403, 'Forbidden');
        else {
            util.formatItem(item, req, observations_config.path, observations_config.id_prefix + item.id);
            res.status(200).json(item);
        }
    })
    .post((req, res) => {
        res.set('Accept', 'GET, PATCH, PUT, DELETE');
        res.error(405, 'Forbidden operation');
    })
    .patch(util.checkContentType, (req, res, next) => {
            let soft_filters = observations_config.property_filters.map((property_filter) => {
                let newFilter = property_filter;
                newFilter.required = false;
                return newFilter;
            });
            util.validateData(req, res, next, soft_filters)
        }, util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(observations_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
            return;
        }
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        if(req.body.hasOwnProperty('location')) item.location = req.body.location;
        if(req.body.hasOwnProperty('image')) item.image = req.body.image;
        item.meta = newMeta(req.auth.sub);
        if(req.body.hasOwnProperty('public')) item.meta.public = req.body.public;
        await dm.putItem(observations_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .put(util.checkContentType, (req, res, next) => util.validateData(req, res, next, observations_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(observations_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
            return;
        }
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        item.location = req.body.location;
        if(req.body.hasOwnProperty('image')) item.image = req.body.image;
        item.meta = newMeta(req.auth.sub);
        if(req.body.hasOwnProperty('public')) item.meta.public = req.body.public;
        await dm.putItem(observations_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .delete(util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(observations_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden')
            return;
        }
        if(item.species !== null) {
            let species = await dm.getItem(species_config.key, item.species.slice(3));
            const index = species.observations.indexOf(observations_config.id_prefix + res.locals.id);
            if (index > -1) { 
                species.observations.splice(index, 1);
            }
            await dm.putItem(species_config.key, item.species.slice(3), species);
        }
        await dm.deleteItem(observations_config.key, res.locals.id);
        res.status(204).end();
    })

module.exports = router;
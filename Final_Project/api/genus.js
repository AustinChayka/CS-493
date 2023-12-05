const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, genera_config, species_config} = require('../modules/data.js');

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
        const results = await dm.getPage(genera_config.key, cursor);
        let items = results.items.map((item) => util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id));
        items.map((item) => util.trim(item, ['meta']));
        await Promise.all(items.map(async (item) => {
            item.species = await Promise.all(item.species.map(async (gid) => {
                let id = gid.slice(3);
                let species = await dm.getItem(species_config.key, id);
                util.formatItem(species, req, species_config.path, gid);
                util.trim(species, ['observations', 'genus', 'meta']);
                return species;
            }));
        }));
        let responseJSON = {
            results: items
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, genera_config.path + '?cursor=' + results.nextCursor);
        res.status(200).send(responseJSON);
    })
    .post((req, res, next) => util.validateData(req, res, next, genera_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = genera_config.constructor(req.auth.sub, req.body);
        const item_key = await dm.postItem(genera_config.key, item);
        util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item_key.id)
        res.status(200).json(item);
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
    .all((req, res, next) => util.checkIdentifier(req, res, next, genera_config.id_prefix, genera_config.key))
    .get(async (req, res) => {
        if(res.locals.id === -1) {
            res.error(404, 'Not found');
            return;
        }
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) res.error(404, 'Not found');
        else {
            util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id);
            item.species = await Promise.all(item.species.map(async (gid) => {
                let id = gid.slice(3);
                let species = await dm.getItem(species_config.key, id);
                util.formatItem(species, req, species_config.path, gid);
                util.trim(species, ['observations', 'genus', 'meta']);
                return species;
            }));
            res.status(200).json(item);
        }
    })
    .post((req, res) => {
        res.set('Accept', 'GET, PATCH, PUT, DELETE');
        res.error(405, 'Forbidden operation');
    })
    .patch((req, res, next) => {
            let soft_filters = genera_config.property_filters.map((property_filter) => {
                let newFilter = property_filter;
                newFilter.required = false;
                return newFilter;
            });
            util.validateData(req, res, next, soft_filters)
        }, util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
        }
        if(req.body.hasOwnProperty('name')) item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        item.meta = newMeta(req.auth.sub);
        await dm.putItem(genera_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .put((req, res, next) => util.validateData(req, res, next, genera_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
        }
        item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        item.meta = newMeta(req.auth.sub);
        await dm.putItem(genera_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .delete(util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden')
        }
        await dm.deleteItem(genera_config.key, res.locals.id);
        res.status(204).end();
    })

    
    router.route('/:identifier/' + species_config.path)
        .all((req, res, next) => util.checkIdentifier(req, res, next, genera_config.id_prefix, genera_config.key))
        .get(async (req, res) => {
            if(res.locals.id === -1) {
                res.error(404, 'Not found');
                return;
            }
            let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(species_config.key, 'genus', '=', genera_config.id_prefix + res.locals.id, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, species_config.path, species_config.id_prefix + item.id));
            items.map((item) => util.trim(item, ['meta', 'genus']));
            let responseJSON = {
                results: items
            }
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, species_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
        })
        .post((req, res, next) => util.validateData(req, res, next, species_config.property_filters), util.enforceJWT, async (req, res) => {
            let item = species_config.constructor(req.auth.sub, req.body);
            item['genus'] = genera_config.id_prefix + res.locals.id;
            const item_key = await dm.postItem(species_config.key, item);
            let parent = await dm.getItem(genera_config.key, res.locals.id);
            parent['species'].push(species_config.id_prefix + item_key.id);
            await dm.putItem(genera_config.key, res.locals.id, parent);
            util.formatItem(item, req, species_config.path, species_config.id_prefix + item_key.id)
            res.status(200).json(item);
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
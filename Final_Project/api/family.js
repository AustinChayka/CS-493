const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, families_config, genera_config} = require('../modules/data.js');

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
        const results = await dm.getPage(families_config.key, cursor);
        let items = results.items.map((item) => util.formatItem(item, req, families_config.path, families_config.id_prefix + item.id));
        items.map((item) => util.trim(item, ['meta']));
        await Promise.all(items.map(async (item) => {
            item.genera = await Promise.all(item.genera.map(async (gid) => {
                let id = gid.slice(3);
                let genus = await dm.getItem(genera_config.key, id);
                util.formatItem(genus, req, genera_config.path, gid);
                util.trim(genus, ['species', 'family', 'meta']);
                return genus;
            }));
        }));
        if(Object.keys(req.query).includes('verified')) {
            if(req.query.verified === 'true') {
                items = util.filterVerified(items);
                items.map((item) => {
                    item.genera = util.filterVerified(item.genera);
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
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, families_config.path + '?cursor=' + results.nextCursor);
        res.status(200).send(responseJSON);
    })
    .post(util.checkContentType, (req, res, next) => util.validateData(req, res, next, families_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = families_config.constructor(req.auth.sub, req.body);
        const item_key = await dm.postItem(families_config.key, item);
        util.formatItem(item, req, families_config.path, families_config.id_prefix + item_key.id)
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
    .all((req, res, next) => util.checkIdentifier(req, res, next, families_config.id_prefix, families_config.key))
    .get(util.checkAccepts, async (req, res) => {
        const item = await dm.getItem(families_config.key, res.locals.id);
        if(item === null) res.error(404, 'Not found');
        else {
            util.formatItem(item, req, families_config.path, families_config.id_prefix + item.id);
            item.genera = await Promise.all(item.genera.map(async (gid) => {
                let id = gid.slice(3);
                let genus = await dm.getItem(genera_config.key, id);
                util.formatItem(genus, req, genera_config.path, gid);
                util.trim(genus, ['species', 'family', 'meta']);
                return genus;
            }));
            if(Object.keys(req.query).includes('verified')) {
                if(req.query.verified === 'true') {
                    item.genera = util.filterVerified(item.genera);
                }
                else if(req.query.verified !== 'false') {
                    res.error(400, "query parameter 'verified' must be true or false");
                    return;
                }
            }
            res.status(200).json(item);
        }
    })
    .post((req, res) => {
        res.set('Accept', 'GET, PATCH, PUT, DELETE');
        res.error(405, 'Forbidden operation');
    })
    .patch(util.checkContentType, (req, res, next) => {
            let soft_filters = families_config.property_filters.map((property_filter) => {
                let newFilter = property_filter;
                newFilter.required = false;
                return newFilter;
            });
            util.validateData(req, res, next, soft_filters)
        }, util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(families_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
            return;
        }
        if(req.body.hasOwnProperty('name')) item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        if(req.body.hasOwnProperty('diagnostic_features')) item.diagnostic_features = req.body.diagnostic_features;
        item.meta = newMeta(req.auth.sub);
        await dm.putItem(families_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .put(util.checkContentType, (req, res, next) => util.validateData(req, res, next, families_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(families_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
            return;
        }
        item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        if(req.body.hasOwnProperty('diagnostic_features')) item.diagnostic_features = req.body.diagnostic_features;
        item.meta = newMeta(req.auth.sub);
        await dm.putItem(families_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .delete(util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(families_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden')
            return;
        }
        await Promise.all(item.genera.map(async (sid) => {
            let id = sid.slice(3);
            let genus = await dm.getItem(genera_config.key, id);
            genus.family = null;
            await dm.putItem(genera_config.key, id, genus);
        }));
        await dm.deleteItem(families_config.key, res.locals.id);
        res.status(204).end();
    })

    
    router.route('/:identifier/' + genera_config.path)
        .all((req, res, next) => util.checkIdentifier(req, res, next, families_config.id_prefix, families_config.key))
        .get(util.checkAccepts, async (req, res) => {
            let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(genera_config.key, 'family', '=', families_config.id_prefix + res.locals.id, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id));
            items.map((item) => util.trim(item, ['meta', 'family']));
            if(Object.keys(req.query).includes('verified')) {
                if(req.query.verified === 'true') {
                    items = util.filterVerified(items);
                    items.map((item) => {
                        item.species = util.filterVerified(item.species);
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
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, genera_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
        })
        .post(util.checkContentType, (req, res, next) => util.validateData(req, res, next, genera_config.property_filters), util.enforceJWT, async (req, res) => {
            let parent = await dm.getItem(families_config.key, res.locals.id);
            if(parent === null) {
                res.error(404, 'Not found');
                return;
            }
            let item = genera_config.constructor(req.auth.sub, req.body);
            item['family'] = families_config.id_prefix + res.locals.id;
            const item_key = await dm.postItem(genera_config.key, item);
            parent['genera'].push(genera_config.id_prefix + item_key.id);
            await dm.putItem(families_config.key, res.locals.id, parent);
            util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item_key.id)
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

    router.route('/:identifier/' + genera_config.path + '/:subidentifier')
        .all((req, res, next) => util.checkIdentifier(req, res, next, families_config.id_prefix, families_config.key, subprefix=genera_config.id_prefix, subkey=genera_config.key))
        .get((req, res) => {
            res.set('Accept', 'PUT, DELETE');
            res.error(405, 'Forbidden operation');
        })
        .post((req, res) => {
            res.set('Accept', 'PUT, DELETE');
            res.error(405, 'Forbidden operation');
        })
        .patch((req, res) => {
            res.set('Accept', 'PUT, DELETE');
            res.error(405, 'Forbidden operation');
        })
        .put(util.enforceJWT, async (req, res) => {
            let family = await dm.getItem(families_config.key, res.locals.id);
            let genus = await dm.getItem(genera_config.key, res.locals.subid);
            if(family === null || genus === null) {
                res.error(404, 'Not found');
                return;
            }
            if(genus.family !== null) {
                res.error(400, 'Genus already assigned to a Family');
                return;
            }
            if(family.meta.owner && req.auth.sub !== family.meta.owner || genus.meta.owner && req.auth.sub !== genus.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            family.genera.push(genera_config.id_prefix + res.locals.subid);
            genus.family = families_config.id_prefix + res.locals.id;
            family.verified = false;
            genus.verified = false;
            await dm.putItem(families_config.key, res.locals.id, family);
            await dm.putItem(genera_config.key, res.locals.subid, genus);
            res.status(204).end();
        })
        .delete(util.enforceJWT, async (req, res) => {
            let family = await dm.getItem(families_config.key, res.locals.id);
            let genus = await dm.getItem(genera_config.key, res.locals.subid);
            if(family === null || genus === null) {
                res.error(404, 'Not found');
                return;
            }
            if(genus.family !== families_config.id_prefix + res.locals.id) {
                res.error(400, 'Genus does not belong to this Family');
                return;
            }
            if(family.meta.owner && req.auth.sub !== family.meta.owner || genus.meta.owner && req.auth.sub !== genus.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            const index = family.genera.indexOf(genera_config.id_prefix + res.locals.subid);
            if (index > -1) { 
                family.genera.splice(index, 1);
            }
            genus.family = null;
            family.verified = false;
            genus.verified = false;
            await dm.putItem(families_config.key, res.locals.id, family);
            await dm.putItem(genera_config.key, res.locals.subid, genus);
            res.status(204).end();
        })

module.exports = router;
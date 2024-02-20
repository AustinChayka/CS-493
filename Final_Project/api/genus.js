const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, genera_config, species_config, families_config} = require('../modules/data.js');

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
        const results = await dm.getPage(genera_config.key, cursor);
        let items = results.items.map((item) => util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id));
        items.map((item) => util.trim(item, ['meta']));
        await Promise.all(items.map(async (item) => {
            item.species = await Promise.all(item.species.map(async (sid) => {
                let id = sid.slice(3);
                let species = await dm.getItem(species_config.key, id);
                util.formatItem(species, req, species_config.path, sid);
                util.trim(species, ['species', 'genus', 'meta']);
                return species;
            }));
        }));
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
        const item = genera_config.constructor(req.auth.sub, req.body);
        const item_key = await dm.postItem(genera_config.key, item);
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

router.route('/:identifier')
    .all((req, res, next) => util.checkIdentifier(req, res, next, genera_config.id_prefix, genera_config.key))
    .get(util.checkAccepts, async (req, res) => {
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) res.error(404, 'Not found');
        else {
            util.formatItem(item, req, genera_config.path, genera_config.id_prefix + item.id);
            item.species = await Promise.all(item.species.map(async (gid) => {
                let id = gid.slice(3);
                let species = await dm.getItem(species_config.key, id);
                util.formatItem(species, req, species_config.path, gid);
                util.trim(species, ['species', 'genus', 'meta']);
                return species;
            }));
            if(Object.keys(req.query).includes('verified')) {
                if(req.query.verified === 'true') {
                    item.species = util.filterVerified(item.species);
                }
                else if(req.query.verified !== 'false') {
                    res.error(400, "query parameter 'verified' must be true or false");
                    return;
                }
            }
            if(item.family !== null) {
                let family = await dm.getItem(families_config.key, item.family.slice(3));
                util.trim(family, ['meta', 'genera']);
                util.formatItem(family, req, families_config.path, item.family);
                item.family = family;
            }
            res.status(200).json(item);
        }
    })
    .post((req, res) => {
        res.set('Accept', 'GET, PATCH, PUT, DELETE');
        res.error(405, 'Forbidden operation');
    })
    .patch(util.checkContentType, (req, res, next) => {
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
            return;
        }
        if(req.body.hasOwnProperty('name')) item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        if(req.body.hasOwnProperty('diagnostic_features')) item.diagnostic_features = req.body.diagnostic_features;
        item.meta = newMeta(req.auth.sub);
        await dm.putItem(genera_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .put(util.checkContentType, (req, res, next) => util.validateData(req, res, next, genera_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(genera_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden');
            return;
        }
        item.name = req.body.name;
        if(req.body.hasOwnProperty('verified')) item.verified = req.body.verified;
        if(req.body.hasOwnProperty('diagnostic_features')) item.diagnostic_features = req.body.diagnostic_features;
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
            return;
        }
        await Promise.all(item.species.map(async (sid) => {
            let id = sid.slice(3);
            let species = await dm.getItem(species_config.key, id);
            species.genus = null;
            await dm.putItem(species_config.key, id, species);
        }));
        if(item.family !== null) {
            let family = await dm.getItem(families_config.key, item.family.slice(3));
            const index = family.genera.indexOf(genera_config.id_prefix + res.locals.id);
            if (index > -1) { 
                family.genera.splice(index, 1);
            }
            await dm.putItem(families_config.key, item.family.slice(3), family);
        }
        await dm.deleteItem(genera_config.key, res.locals.id);
        res.status(204).end();
    })

    
    router.route('/:identifier/' + species_config.path)
        .all((req, res, next) => util.checkIdentifier(req, res, next, genera_config.id_prefix, genera_config.key))
        .get(util.checkAccepts, async (req, res) => {
            let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(species_config.key, 'genus', '=', genera_config.id_prefix + res.locals.id, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, species_config.path, species_config.id_prefix + item.id));
            items.map((item) => util.trim(item, ['meta', 'genus']));
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
            if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, species_config.path + '?cursor=' + results.nextCursor);
            res.status(200).send(responseJSON);
        })
        .post(util.checkContentType, (req, res, next) => util.validateData(req, res, next, species_config.property_filters), util.enforceJWT, async (req, res) => {
            let item = species_config.constructor(req.auth.sub, req.body);
            item['genus'] = genera_config.id_prefix + res.locals.id;
            const item_key = await dm.postItem(species_config.key, item);
            let parent = await dm.getItem(genera_config.key, res.locals.id);
            parent['species'].push(species_config.id_prefix + item_key.id);
            await dm.putItem(genera_config.key, res.locals.id, parent);
            util.formatItem(item, req, species_config.path, species_config.id_prefix + item_key.id)
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

    router.route('/:identifier/' + species_config.path + '/:subidentifier')
        .all((req, res, next) => util.checkIdentifier(req, res, next, genera_config.id_prefix, genera_config.key, subprefix=species_config.id_prefix, subkey=species_config.key))
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
            let genus = await dm.getItem(genera_config.key, res.locals.id);
            let species = await dm.getItem(species_config.key, res.locals.subid);
            if(genus === null || species === null) {
                res.error(404, 'Not found');
                return;
            }
            if(species.genus !== null) {
                res.error(400, 'species already assigned to a genus');
                return;
            }
            if(genus.meta.owner && req.auth.sub !== genus.meta.owner || species.meta.owner && req.auth.sub !== species.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            genus.species.push(species_config.id_prefix + res.locals.subid);
            species.genus = genera_config.id_prefix + res.locals.id;
            genus.verified = false;
            species.verified = false;
            await dm.putItem(genera_config.key, res.locals.id, genus);
            await dm.putItem(species_config.key, res.locals.subid, species);
            res.status(204).end();
        })
        .delete(util.enforceJWT, async (req, res) => {
            let genus = await dm.getItem(genera_config.key, res.locals.id);
            let species = await dm.getItem(species_config.key, res.locals.subid);
            if(genus === null || species === null) {
                res.error(404, 'Not found');
                return;
            }
            if(species.genus !== genera_config.id_prefix + res.locals.id) {
                res.error(400, 'species does not belong to this genus');
                return;
            }
            if(genus.meta.owner && req.auth.sub !== genus.meta.owner || species.meta.owner && req.auth.sub !== species.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            const index = genus.species.indexOf(species_config.id_prefix + res.locals.subid);
            if (index > -1) { 
                genus.species.splice(index, 1);
            }
            species.genus = null;
            genus.verified = false;
            species.verified = false;
            await dm.putItem(genera_config.key, res.locals.id, genus);
            await dm.putItem(species_config.key, res.locals.subid, species);
            res.status(204).end();
        })

module.exports = router;
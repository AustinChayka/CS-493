const express = require('express');
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');
const {newMeta, species_config, genera_config, observations_config} = require('../modules/data.js');

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
        const results = await dm.getPage(species_config.key, cursor);
        let items = results.items.map((item) => util.formatItem(item, req, species_config.path, species_config.id_prefix + item.id));
        items.map((item) => util.trim(item, ['meta']));
        await Promise.all(items.map(async (item) => {
            item.observations = await Promise.all(item.observations.map(async (gid) => {
                let id = gid.slice(3);
                let observation = await dm.getItem(observations_config.key, id);
                util.formatItem(observation, req, observations_config.path, gid);
                util.trim(observation, ['species', 'meta']);
                return observation;
            }));
        }));
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
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, species_config.path + '?cursor=' + results.nextCursor);
        res.status(200).send(responseJSON);
    })
    .post(util.checkContentType, (req, res, next) => util.validateData(req, res, next, species_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = species_config.constructor(req.auth.sub, req.body);
        const item_key = await dm.postItem(species_config.key, item);
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

router.route('/:identifier')
    .all((req, res, next) => util.checkIdentifier(req, res, next, species_config.id_prefix, species_config.key))
    .get(util.checkAccepts, async (req, res) => {
        const item = await dm.getItem(species_config.key, res.locals.id);
        if(item === null) res.error(404, 'Not found');
        else {
            util.formatItem(item, req, species_config.path, species_config.id_prefix + item.id);
            item.observations = await Promise.all(item.observations.map(async (gid) => {
                let id = gid.slice(3);
                let observation = await dm.getItem(observations_config.key, id);
                util.formatItem(observation, req, observations_config.path, gid);
                util.trim(observation, ['species', 'meta']);
                return observation;
            }));
            if(Object.keys(req.query).includes('verified')) {
                if(req.query.verified === 'true') {
                    item.observations = util.filterVerified(item.observations);
                }
                else if(req.query.verified !== 'false') {
                    res.error(400, "query parameter 'verified' must be true or false");
                    return;
                }
            }
            if(item.genus !== null) {
                let genus = await dm.getItem(genera_config.key, item.genus.slice(3));
                util.trim(genus, ['meta', 'species']);
                util.formatItem(genus, req, genera_config.path, item.genus);
                item.genus = genus;
            }
            res.status(200).json(item);
        }
    })
    .post((req, res) => {
        res.set('Accept', 'GET, PATCH, PUT, DELETE');
        res.error(405, 'Forbidden operation');
    })
    .patch(util.checkContentType, (req, res, next) => {
            let soft_filters = species_config.property_filters.map((property_filter) => {
                let newFilter = property_filter;
                newFilter.required = false;
                return newFilter;
            });
            util.validateData(req, res, next, soft_filters)
        }, util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(species_config.key, res.locals.id);
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
        await dm.putItem(species_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .put(util.checkContentType, (req, res, next) => util.validateData(req, res, next, species_config.property_filters), util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(species_config.key, res.locals.id);
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
        await dm.putItem(species_config.key, res.locals.id, item);
        res.status(204).end();
    })
    .delete(util.enforceJWT, async (req, res) => {
        const item = await dm.getItem(species_config.key, res.locals.id);
        if(item === null) {
            res.error(404, 'Not Found');
            return;
        } else if(item.meta && item.meta.owner !== req.auth.sub) {
            res.error(403, 'Forbidden')
            return;
        }
        await Promise.all(item.observations.map(async (sid) => {
            let id = sid.slice(3);
            let observation = await dm.getItem(observations_config.key, id);
            observation.species = null;
            await dm.putItem(observations_config.key, id, observation);
        }));
        if(item.genus !== null) {
            let genus = await dm.getItem(genera_config.key, item.genus.slice(3));
            const index = genus.species.indexOf(species_config.id_prefix + res.locals.id);
            if (index > -1) { 
                genus.species.splice(index, 1);
            }
            await dm.putItem(genera_config.key, item.genus.slice(3), genus);
        }
        await dm.deleteItem(species_config.key, res.locals.id);
        res.status(204).end();
    })

    
    router.route('/:identifier/' + observations_config.path)
        .all((req, res, next) => util.checkIdentifier(req, res, next, species_config.id_prefix, species_config.key))
        .get(util.checkAccepts, async (req, res) => {
            let cursor = null;
            if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
            const results = await dm.querySelect(observations_config.key, 'species', '=', species_config.id_prefix + res.locals.id, cursor);
            let items = results.items.map((item) => util.formatItem(item, req, observations_config.path, observations_config.id_prefix + item.id));
            items.filter((item) => {
                return item.meta.public || (req.auth && req.auth.sub === item.meta.owner);
            });
            items.map((item) => util.trim(item, ['meta', 'species']));
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
            let item = observations_config.constructor(req.auth.sub, req.body);
            item['species'] = species_config.id_prefix + res.locals.id;
            const item_key = await dm.postItem(observations_config.key, item);
            let parent = await dm.getItem(species_config.key, res.locals.id);
            parent['observations'].push(observations_config.id_prefix + item_key.id);
            await dm.putItem(species_config.key, res.locals.id, parent);
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

    router.route('/:identifier/' + observations_config.path + '/:subidentifier')
        .all((req, res, next) => util.checkIdentifier(req, res, next, species_config.id_prefix, species_config.key, subprefix=observations_config.id_prefix, subkey=species_config.key))
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
            let species = await dm.getItem(species_config.key, res.locals.id);
            let observation = await dm.getItem(observations_config.key, res.locals.subid);
            if(species === null || observation === null) {
                res.error(404, 'Not found');
                return;
            }
            if(observation.species !== null) {
                res.error(400, 'observation already assigned to a apecies');
                return;
            }
            if(species.meta.owner && req.auth.sub !== species.meta.owner || observation.meta.owner && req.auth.sub !== observation.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            species.observations.push(observations_config.id_prefix + res.locals.subid);
            observation.species = species_config.id_prefix + res.locals.id;
            species.verified = false;
            observation.verified = false;
            await dm.putItem(species_config.key, res.locals.id, species);
            await dm.putItem(observations_config.key, res.locals.subid, observation);
            res.status(204).end();
        })
        .delete(util.enforceJWT, async (req, res) => {
            let species = await dm.getItem(species_config.key, res.locals.id);
            let observation = await dm.getItem(observations_config.key, res.locals.subid);
            if(species === null || observation === null) {
                res.error(404, 'Not found');
                return;
            }
            if(observation.species !== species_config.id_prefix + res.locals.id) {
                res.error(400, 'observation does not belong to this species');
                return;
            }
            if(species.meta.owner && req.auth.sub !== species.meta.owner || observation.meta.owner && req.auth.sub !== observation.meta.owner) {
                res.error(403, 'Forbidden');
                return;
            }
            const index = species.observations.indexOf(observations_config.id_prefix + res.locals.subid);
            if (index > -1) { 
                species.observations.splice(index, 1);
            }
            observation.species = null;
            species.verified = false;
            observation.verified = false;
            await dm.putItem(species_config.key, res.locals.id, species);
            await dm.putItem(observations_config.key, res.locals.subid, observation);
            res.status(204).end();
        })

module.exports = router;
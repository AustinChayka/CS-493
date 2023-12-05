const express = require('express');
const router = express.Router();
const dm = require('../modules/data_manager.js');
const util = require('../modules/util.js');
const json2html = require('json-to-html');

const acceptableTypes = ['application/json', 'text/html'];
const contentType = 'application/json';

const newBoat = (name, type, length) => {
    return {
        'name': name,
        'type': type,
        'length': length
    }
}

const error405Root = (req, res) => {
    res.set('Accept', 'GET, POST');
    res.status(405).json({
        'Error': 'Operation not allowed'
    });
}

const error405Boat = (req, res) => {
    res.set('Accept', 'GET, DELETE, PUT, PATCH');
    res.status(405).json({
        'Error': 'Operation not allowed'
    });
}

const validateId = async (req, res, next) => {
    if(req.params.bid === 'null') {
        res.status(404).json({
            'Error': 'Invalid boat id'
        });
        return;
    }
    const boat = await dm.getItem(dm.BOAT, req.params.bid);
    if(boat === null) 
        res.status(404).json({
            'Error': 'No boat with this id exists'
        });
    else {
        res.locals.boat = boat;
        next();
    }
}

const checkAccepts = (req, res, next) => {
    const accepts = req.accepts(acceptableTypes);
    if(!accepts)
        res.status(406).json({
            'Error': 'Not acceptable'
        });
    else {
        res.locals.accepts = accepts;
        next();
    }
}

const checkContentType = (req, res, next) => {
    if(req.get('content-type') !== contentType)
        res.status(415).json({
            'Error': 'Wrong content type'
        });
    else
        next();
}

const checkUniqueName = async (name) => {
    const matches = await dm.querySelect(dm.BOAT, 'name', name);
    return matches.length !== 0;
}

const validateAllBoatAttributes = async (req, res, next) => {
    if(!req.body.name || !req.body.type || !req.body.length)
        res.status(400).json({
            'Error': 'Request body missing attribute'
        });
    else if(typeof req.body.name !== 'string' || typeof req.body.type !== 'string' || typeof req.body.length !== 'number')
        res.status(400).json({
            'Error': 'Request body has attribute of wrong type'
        });
    else if(await checkUniqueName(req.body.name))
        res.status(403).json({
            'Error': 'Boat name already in use'
        });
    else
        next();
}

const validateAnyBoatAttributes = async (req, res, next) => {
    var foundFlag = false;
    if(req.body.name) {
        if(typeof req.body.name !== 'string') {
            res.status(400).json({
                'Error': 'Request body has attribute of wrong type'
            });
            return;
        } else if(await checkUniqueName(req.body.name)) {
            res.status(403).json({
                'Error': 'Boat name already in use'
            });
            return;
        } else
            foundFlag = true;   
    }
    if(req.body.type) {
        if(typeof req.body.type !== 'string') {
            res.status(400).json({
                'Error': 'Request body has attribute of wrong type'
            });
            return;
        } else
            foundFlag = true;   
    }
    if(req.body.length) {
        if(typeof req.body.length !== 'number') {
            res.status(400).json({
                'Error': 'Request body has attribute of wrong type'
            });
            return;
        } else
            foundFlag = true;   
    }
    if(!foundFlag)
        res.status(400).json({
            'Error': 'Request body missing attribute'
        });
    else 
        next();
}

router.route('/')
    .post(checkContentType, validateAllBoatAttributes, async (req, res) => {
        const boat = newBoat(req.body.name, req.body.type, req.body.length);
        const key = await dm.postItem(dm.BOAT, boat);
        util.formatItem(boat, req, 'boats', key.id);
        res.status(201).json(boat);
    })
    .get(checkAccepts, async (req, res) => {
        var cursor = null;
        if(Object.keys(req.query).includes('cursor')) cursor = req.query.cursor;
        const results = await dm.getPage(dm.BOAT, cursor);
        var responseJSON = {
            'boats': results.items.map((boat) => util.formatItem(boat, req, 'boats'))
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, 'boats?cursor=' + results.nextCursor);
        if(res.locals.accepts === 'application/json')
            res.status(200).json(responseJSON);
        else if(res.locals.accepts === 'text/html')
            res.status(200).send(json2html(responseJSON));
        else
            res.status(500).send('Content type got messed up');
    })
    .delete(error405Root)
    .put(error405Root)
    .patch(error405Root);

router.route('/:bid')
    .post(error405Boat)
    .get(checkAccepts, validateId, (req, res) => {
        const boat = util.formatItem(res.locals.boat, req, 'boats');
        if(res.locals.accepts === 'application/json')
            res.status(200).json(boat);
        else if(res.locals.accepts === 'text/html')
            res.status(200).send(json2html(boat));
        else
            res.status(500).send('Content type got messed up');
    })
    .delete(validateId, async (req, res) => {
        await dm.deleteItem(dm.BOAT, req.params.bid);
        res.status(204).end();
    })
    .put(checkContentType, validateAllBoatAttributes, validateId, async (req, res) => {
        var boat = newBoat(req.body.name, req.body.type, req.body.length);
        const key = await dm.putItem(dm.BOAT, req.params.bid, boat);
        res.location(util.buildURL(req, 'boats/' + key.id));
        res.status(303).end();
    })
    .patch(checkContentType, validateAnyBoatAttributes, validateId, async (req, res) => {
        var boat = res.locals.boat;
        if(req.body.name) boat.name = req.body.name;
        if(req.body.type) boat.type = req.body.type;
        if(req.body.length) boat.length = req.body.length;
        await dm.putItem(dm.BOAT, req.params.bid, boat);
        res.status(204).end();
    });

module.exports = router;
const express = require('express');
const router = express.Router();
const util = require('../modules/util.js');
const dm = require('../modules/data_manager.js');

router.use(util.checkJWT);
router.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
        req.auth = null;
        next();
    } else {
        next(err);
    }
});

const boat_subRouter = express.Router();
const owners_subRouter = express.Router();

const newBoat = (name, type, length, public, owner) => {
    return {
        name: name,
        type: type,
        length: length,
        public: public,
        owner: owner
    }
}

boat_subRouter.route('/')
    .get(async (req, res) => {
        var boats = {};
        if(!req.auth || req.auth === null) {
            boats = await dm.querySelect(dm.BOAT, 'public', true);
        } else {
            boats = await dm.querySelect(dm.BOAT, 'owner', req.auth.sub);
        }
        res.status(200).json({
            'boats': boats
        });
    })
    .post(async (req, res) => {
        if(!req.auth || req.auth === null) res.error(401, 'Invalid or missing JWT');
        else if(!req.body.hasOwnProperty('name') || !req.body.hasOwnProperty('type') || !req.body.hasOwnProperty('length') || !req.body.hasOwnProperty('public')) res.error(400, 'Request body missing attribute(s)');
        else {
            const boat = newBoat(req.body.name, req.body.type, req.body.length, req.body.public, req.auth.sub);
            const key = await dm.postItem(dm.BOAT, boat);
            util.formatItem(boat, req, 'boats', key.id);
            res.status(201).json(boat);
        }
    });

boat_subRouter.route('/:bid')
    .get(async (req, res) => {
        const boat = await dm.getItem(dm.BOAT, req.params.bid);
        if(boat === null || (!boat.public && (!req.auth || req.auth === null || req.auth.sub !== boat.owner))) res.error(403, 'Cannot find boat with this ID');
        else res.status(200).json(util.formatItem(boat, req, 'boats'));
    })
    .delete(async (req, res) => {
        const boat = await dm.getItem(dm.BOAT, req.params.bid);
        if(!req.auth || req.auth === null) res.error(401, 'Invalid or missing JWT');
        else if(boat === null || req.auth.sub !== boat.owner) res.error(403, 'Cannot find boat with this ID');
        else {
            await dm.deleteItem(dm.BOAT, req.params.bid);
            res.status(204).end();
        }
    });

owners_subRouter.route('/:oid/boats')
    .get(async (req, res) => {
        var boats = await dm.querySelect(dm.BOAT, 'owner', req.params.oid);
        if(!req.auth || req.auth === null) {
            boats = boats.filter((boat) => boat.public);
        }
        res.status(200).json({
            'boats': boats.map((boat) => util.formatItem(boat, req, 'boats'))
        });
    });

router.use('/boats', boat_subRouter);
router.use('/owners', owners_subRouter);

module.exports = router;
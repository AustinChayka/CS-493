const express = require('express');
const router = express.Router();
const dm = require('../modules/data_manager.js');
const util = require('../modules/util.js');

newBoat = (name, type, length) => {
    return {
        'name': name,
        'type': type,
        'length': length,
        'loads': []
    }
}

router.post('/', (req, res) => {
    if(!req.body.name || !req.body.type || !req.body.length)
        res.status(400).json({
            'Error': 'The request object is missing at least one of the required attributes'
        });
    else {
        boat = newBoat(req.body.name, req.body.type, req.body.length);
        dm.postItem(dm.BOAT, boat).then((key) => {
            res.status(201).json(util.formatItem(boat, req, 'boats', key.id));
        });
    }
        
});

router.get('/', (req, res) => {
    var cursor = null
    if(Object.keys(req.query).includes("cursor")) cursor = req.query.cursor;
    dm.getPage(dm.BOAT, cursor).then((results) => {
        responseJSON = {
            'boats': results.items.map((boat) => util.formatItem(boat, req, 'boats'))
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, 'boats?cursor=' + results.nextCursor);
        res.status(200).json(responseJSON);
    });
});

router.get('/:bid', (req, res) => {
    dm.getItem(dm.BOAT, req.params.bid).then((boat) => {
        if(boat === null) 
            res.status(404).json({
                'Error': 'No boat with this boat_id exists'
            });
        else {
            boat = util.formatItem(boat, req, 'boats');
            if(boat.loads.length > 0) 
                boat.loads = boat.loads.map((lid) => util.formatItem({}, req, 'loads', lid));
            res.status(200).json(boat);
        }
    })
});

router.delete('/:bid', (req, res) => {
    dm.getItem(dm.BOAT, req.params.bid).then((boat) => {
        if(boat === null)
            res.status(404).json({
                'Error': 'No boat with this boat_id exists'
            });
        else {
            boat.loads.map(async (lid) => {
                var load = await dm.getItem(dm.LOAD, lid);
                if(load !== null) {
                    load.carrier = null;
                    await dm.putItem(dm.LOAD, lid, load);
                }
            });
            dm.deleteItem(dm.BOAT, req.params.bid).then(() => {
                res.status(204).end();
            });
        }
    });
});

router.put('/:bid/loads/:lid', async (req, res) => {
    var boat = await dm.getItem(dm.BOAT, req.params.bid);
    var load = await dm.getItem(dm.LOAD, req.params.lid);
    if(boat === null || load === null)
        res.status(404).json({
            'Error': 'The specified boat and/or load does not exist'
        });
    else if(load.carrier !== null)
        res.status(403).json({
            'Error': 'The load is already loaded on another boat'
        });
    else {
        boat.loads.push(load.id);
        load.carrier = boat.id;
        await dm.putItem(dm.BOAT, req.params.bid, boat);
        await dm.putItem(dm.LOAD, req.params.lid, load);
        res.status(204).end();
    }
});

router.delete('/:bid/loads/:lid', async (req, res) => {
    var boat = await dm.getItem(dm.BOAT, req.params.bid);
    var load = await dm.getItem(dm.LOAD, req.params.lid);
    if(boat === null || load === null)
        res.status(404).json({
            'Error': 'No boat with this boat_id is loaded with the load with this load_id'
        });
    else {
        var idx = boat.loads.indexOf(req.params.lid);
        if(idx === -1 || load.carrier !== req.params.bid) 
            res.status(404).json({
                'Error': 'No boat with this boat_id is loaded with the load with this load_id'
            });
        else {
            boat.loads.splice(idx, 1);
            load.carrier = null;
            await dm.putItem(dm.BOAT, req.params.bid, boat);
            await dm.putItem(dm.LOAD, req.params.lid, load);
            res.status(204).end();
        }
    }
});

router.get('/:bid/loads', (req, res) => {
    dm.getItem(dm.BOAT, req.params.bid).then(async (boat) => {
        if(boat === null)
            res.status(404).json({
                'Error': 'No boat with this boat_id exists'
            });
        else {
            res.status(200).json({
                'loads': await boat.loads.map(async (lid) => {
                    await dm.getItem(dm.LOAD, lid);
                })
            });
        }
    });
});

module.exports = router;
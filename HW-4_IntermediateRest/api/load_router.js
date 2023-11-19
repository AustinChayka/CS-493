const express = require('express');
const router = express.Router();
const dm = require('../modules/data_manager.js');
const util = require('../modules/util.js');

newLoad = (volume, item, creation_date) => {
    return {
        'volume': volume,
        'item': item,
        'creation_date': creation_date,
        'carrier': null
    }
}

router.post('/', (req, res) => {
    if(!req.body.volume || !req.body.item || !req.body.creation_date)
        res.status(400).json({
            'Error': 'The request object is missing at least one of the required attributes'
        });
    else {
        load = newLoad(req.body.volume, req.body.item, req.body.creation_date);
        dm.postItem(dm.LOAD, load).then((key) => {
            res.status(201).json(util.formatItem(load, req, 'loads', key.id));
        });
    }
        
});

router.get('/', (req, res) => {
    var cursor = null
    if(Object.keys(req.query).includes("cursor")) cursor = req.query.cursor;
    dm.getPage(dm.LOAD, cursor).then((results) => {
        responseJSON = {
            'loads': results.items.map((load) => util.formatItem(load, req, 'loads'))
        }
        if(results.nextCursor !== null) responseJSON.next = util.buildURL(req, 'load?cursor=' + results.nextCursor);
        res.status(200).json(responseJSON);
    });
});

router.get('/:lid', (req, res) => {
    dm.getItem(dm.LOAD, req.params.lid).then((load) => {
        if(load === null) 
            res.status(404).json({
                'Error': 'No load with this load_id exists'
            });
        else {
            load = util.formatItem(load, req, 'loads');
            if(load.carrier !== null) 
                load.carrier = formatItem({}, req, 'boats', load.carrier);
            res.status(200).json(load);
        }
    })
});

router.delete('/:lid', (req, res) => {
    dm.getItem(dm.LOAD, req.params.lid).then(async (load) => {
        if(load === null)
            res.status(404).json({
                'Error': 'No load with this load_id exists'
            });
        else {
            if(load.carrier !== null)
                await dm.getItem(dm.BOAT, load.carrier).then(async (boat) => {
                    if(boat !== null) {
                        var idx = boat.loads.indexOf(req.params.lid);
                        if(idx !== -1) {
                            boat.loads.splice(idx, 1);
                            await dm.putItem(dm.BOAT, load.carrier, boat);
                        }
                    }
                });
            dm.deleteItem(dm.LOAD, req.params.lid).then(() => {
                res.status(204).end();
            });
        }
    });
});

module.exports = router;
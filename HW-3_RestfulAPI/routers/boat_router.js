const express = require('express');
const boat_router = express.Router();
const dataManager = require('../modules/data_manager.js')
const BOAT = dataManager.BOAT;
const SLIP = dataManager.SLIP;

function new_boat(name, type, length) {
    const boat = {
        'name': name,
        'type': type,
        'length': length
    };
    return boat;
}

function post_boat(name, type, length) {
    const boat = new_boat(name, type, length);
    return dataManager.post_item(BOAT, boat);
}

function patch_boat(id, name, type, length) {
    const boat = new_boat(name, type, length);
    return dataManager.patch_item(BOAT, id, boat);
}

boat_router.get('/', (req, res) => {
    dataManager.get_items(BOAT).then((boats) => {
        res.status(200).json(boats);
    });
});

boat_router.get('/:boat_id', (req, res) => {
    dataManager.get_item(BOAT, req.params.boat_id).then((boat) => {
        if(boat === null) 
            res.status(404).json({
                'Error': 'No boat with this boat_id exists'
            });
        else
            res.status(200).json(boat);
    });
});

boat_router.post('/', (req, res) => {
    if(!req.body.name || !req.body.type || !req.body.length)
        res.status(400).json({
            'Error': 'The request object is missing at least one of the required attributes'
        });
    else 
        post_boat(req.body.name, req.body.type, req.body.length).then((key) => {
            res.status(201).json({
                'id': key.id,
                'name': req.body.name,
                'type': req.body.type,
                'length': req.body.length
            });
        });
});

boat_router.patch('/:boat_id', (req, res) => {
    if(!req.body.name || !req.body.type || !req.body.length)
        res.status(400).json({
            'Error': 'The request object is missing at least one of the required attributes'
        });
    else 
        patch_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length).then((key) => {
            if(key === null) 
                res.status(404).json({
                    'Error': 'No boat with this boat_id exists'
                });
            else
                res.status(200).json({
                    'id': key.id,
                    'name': req.body.name,
                    'type': req.body.type,
                    'length': req.body.length
                });
        });
});

boat_router.delete('/:boat_id', (req, res) => {
    dataManager.get_item(BOAT, req.params.boat_id).then(async (boat) => {
        if(boat === null) 
            res.status(404).json({
                'Error': 'No boat with this boat_id exists'
            });
        else {
            const docket_at = await dataManager.query_select(SLIP, 'current_boat', req.params.boat_id);
            if(docket_at.length > 0) {
                const slip = docket_at[0];
                slip.current_boat = null;
                dataManager.patch_item(SLIP, slip.id, slip);
            }
            dataManager.delete_item(BOAT, req.params.boat_id).then(() => {
                res.status(204).end();
            });
        }
    });
});

module.exports = boat_router;
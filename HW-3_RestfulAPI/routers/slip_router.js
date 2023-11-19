const express = require('express');
const slip_router = express.Router();
const dataManager = require('../modules/data_manager.js')
const SLIP = dataManager.SLIP;
const BOAT = dataManager.BOAT;

function new_slip(number) {
    const slip = {
        'number': number,
        'current_boat': null
    }
    return slip;
}

function post_slip(number) {
    const slip = new_slip(number);
    return dataManager.post_item(SLIP, slip);
}

slip_router.get('/', (req, res) => {
    dataManager.get_items(SLIP).then((slips) => {
        res.status(200).json(slips);
    });
});

slip_router.get('/:slip_id', (req, res) => {
    dataManager.get_item(SLIP, req.params.slip_id).then((slip) => {
        if(slip === null) 
            res.status(404).json({
                'Error': 'No slip with this slip_id exists'
            });
        else
            res.status(200).json(slip);
    });
});

slip_router.post('/', (req, res) => {
    if(!req.body.number) 
        res.status(400).json({
            'Error': 'The request object is missing the required number'
        });
    else
        post_slip(req.body.number).then((key) => {
            res.status(201).json({
                'id': key.id,
                'number': req.body.number,
                'current_boat': null
            });
        });
});

slip_router.delete('/:slip_id', (req, res) => {
    dataManager.get_item(SLIP, req.params.slip_id).then((slip) => {
        if(slip === null) 
            res.status(404).json({
                'Error': 'No slip with this slip_id exists'
            });
        else
            dataManager.delete_item(SLIP, req.params.slip_id).then(() => {
                res.status(204).end();
            });
    });
});

slip_router.put('/:slip_id/:boat_id', async (req, res) => {
    const slip = await dataManager.get_item(SLIP, req.params.slip_id);
    const boat = await dataManager.get_item(BOAT, req.params.boat_id);
    if(slip === null || boat === null) 
        res.status(404).json({
            'Error': 'The specified boat and/or slip does not exist'
        });
    else if(slip.current_boat !== null)
        res.status(403).json({
            'Error': 'The slip is not empty'
        });
    else {
        const docked_at = await dataManager.query_select(SLIP, 'current_boat', req.params.boat_id);
        if(docked_at.length != 0)
            res.status(403).json({
                'Error': 'The ship is already docked'
            })
        else {
            slip.current_boat = req.params.boat_id;
            dataManager.patch_item(SLIP, req.params.slip_id, slip).then(() => {
                res.status(204).end();
            })
        }
    }
        
});

slip_router.delete('/:slip_id/:boat_id', async (req, res) => {
    const slip = await dataManager.get_item(SLIP, req.params.slip_id);
    const boat = await dataManager.get_item(BOAT, req.params.boat_id);
    if(slip === null || boat === null || slip.current_boat != req.params.boat_id) 
        res.status(404).json({
            'Error': 'No boat with this boat_id is at the slip with this slip_id'
        });
    else {
        slip.current_boat = null;
        dataManager.patch_item(SLIP, req.params.slip_id, slip).then(() => {
            res.status(204).end();
        });
    }
});

module.exports = slip_router;
const router = require('express').Router();
const family_router = require('./family.js');
const genus_router = require('./genus.js');
const species_router = require('./species.js');
const user_router = require('./users.js');
const observation_router = require('./observation.js');

router.use('/families', family_router);
router.use('/genera', genus_router);
router.use('/species', species_router);
router.use('/users', user_router);
router.use('/observations', observation_router);

module.exports = router;
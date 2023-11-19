const router = require('express').Router();
const axios = require('axios');

router.post('/', async (req, res) => {
    if(!req.body.username || !req.body.password)
        res.error(400, 'Login post missing attributes');
    else {
        const response = await axios.post(`https://${process.env.DOMAIN}/oauth/token`, {
            grant_type: 'password',
            username: req.body.username,
            password: req.body.password,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        .then((response) => {
            return response.data;
        })
        .catch((error) => {
            console.log(error.message);
            return null;
        });
        res.json(response);
    }
});

module.exports = router;
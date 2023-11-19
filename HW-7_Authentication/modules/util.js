const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
require('dotenv').config();

const buildURL = (req, path) => {
    return req.protocol + '://' + req.get('host') + '/' + path;
}

const formatItem = (item, req, path, id=null) => {
    if(id !== null) item.id = id;
    item.self = buildURL(req, path  + '/' + item.id);
    return item;
}

const checkJWT = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 25,
      jwksUri: `https://${process.env.DOMAIN}/.well-known/jwks.json`
    }),
    issuer: `https://${process.env.DOMAIN}/`,
    algorithms: [ 'RS256' ]
});

module.exports = {buildURL, formatItem, checkJWT}
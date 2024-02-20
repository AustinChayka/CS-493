require('dotenv').config();
const {querySelect} = require('./data_manager.js');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const CONTENT_TYPE = 'application/json';
const ACCEPTABLE_TYPES = ['application/json']

const buildURL = (req, path) => {
    return req.protocol + '://' + req.get('host') + '/api/' + path;
}

const formatItem = (item, req, path, id=null) => {
    if(id !== null) item.id = id;
    item.self = buildURL(req, path  + '/' + item.id);
    return item;
}

const checkIdentifier = async (req, res, next, prefix, key, subprefix=null, subkey=null) => {
    if(req.params.identifier.slice(0, 3) === prefix) res.locals.id = req.params.identifier.slice(3);
    else {
        const items = (await querySelect(key, 'name', '=', req.params.identifier)).items;
        if(items.length === 0) {
            res.error(404, 'Name not found');
            return;
        } else res.locals.id = items[0].id;
    }
    if(Object.keys(req.params).includes('subidentifier') && subprefix !== null && subkey !== null) {
        if(req.params.subidentifier.slice(0, 3) === subprefix) res.locals.subid = req.params.subidentifier.slice(3);
        else {
            const subitems = (await querySelect(subkey, 'name', '=', req.params.subidentifier)).items;
            if(subitems.length === 0) {
                res.error(404, 'Sub-name not found');
                return;
            } else res.locals.subid = subitems[0].id;
        }
    }
    next();
}

const validateData = async (req, res, next, property_filters) => {
    const data = req.body;
    for(property of property_filters) {
        if(property.required && !data.hasOwnProperty(property.target_property)) {
            res.error(400, `Request body missing atribute: '${property.target_property}'`);
            return;
        } else if(data.hasOwnProperty(property.target_property)) {
            for(filter of property.filters) {
                if(!(await filter.filter_function(data[property.target_property]))) {
                    res.error(400, `Request attribute '${property.target_property}' violates constraint: ${filter.error_message}`);
                    return;
                }
            }
        }
    };
    next();
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

const enforceJWT = (req, res, next) => {
    if(!req.auth || req.auth === null) res.error(401, 'Invalid or missing JWT');
    else next();
}

const trim = (item, properties) => {
    properties.forEach((property) => {
        delete item[property];
    });
}

const filterVerified = (items) => {
    return items.filter((item) => {
        return item.hasOwnProperty('verified') && item.verified;
    });
}

const checkContentType = (req, res, next) => {
    if(req.get('content-type') !== CONTENT_TYPE)
        res.error(415, 'Wrong content type');
    else
        next();
}

const checkAccepts = (req, res, next) => {
    const accepts = req.accepts(ACCEPTABLE_TYPES);
    if(!accepts)
        res.status(406).json({
            'Error': 'Not acceptable'
        });
    else {
        res.locals.accepts = accepts;
        next();
    }
}

module.exports = {
    buildURL, 
    formatItem, 
    checkIdentifier, 
    validateData, 
    checkJWT, 
    enforceJWT, 
    trim,
    filterVerified,
    checkContentType,
    checkAccepts
}
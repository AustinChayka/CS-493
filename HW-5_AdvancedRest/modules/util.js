const buildURL = (req, path) => {
    return req.protocol + '://' + req.get('host') + '/' + path;
}

const formatItem = (item, req, path, id=null) => {
    if(id !== null) item.id = id;
    item.self = buildURL(req, path  + '/' + item.id);
    return item;
}

module.exports = {buildURL, formatItem}
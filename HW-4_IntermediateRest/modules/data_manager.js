const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

const BOAT = 'boat';
const LOAD = 'load';
const PAGE_SIZE = 3;

fromDatastore = (item) => {
    item.id = item[Datastore.KEY].id;
    return item;
}

getKey = (item_key, item_id) => {
    return datastore.key([item_key, parseInt(item_id, 10)]);
}

postItem = (item_key, item) => {
    var key = datastore.key(item_key);
    return datastore.save({
        'key': key,
        'data': item
    }).then(() => {
        return key;
    });
}

getPage = (item_key, cursor=null) => {
    var query = datastore.createQuery(item_key).limit(PAGE_SIZE);
    const results = {
        'items': null,
        'nextCursor': null
    }
    if(cursor !== null) query = query.start(cursor);
    return datastore.runQuery(query).then((entities) => {
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS) results.nextCursor = entities[1].endCursor;
        return results;
    });
}

getItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.get(key).then((entity) => {
        if(entity[0] === undefined || entity[0] === null) return null;
        else return entity.map(fromDatastore)[0];
    });
}

deleteItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.delete(key);
}

putItem = (item_key, item_id, item) => {
    var key = getKey(item_key, item_id);
    return datastore.save({
        'key': key,
        'data': item
    }).then(() => {
        return key;
    });
}

module.exports = {BOAT, LOAD, postItem, getPage, getItem, deleteItem, putItem}
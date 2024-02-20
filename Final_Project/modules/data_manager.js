const {Datastore, PropertyFilter} = require('@google-cloud/datastore');
const datastore = new Datastore();

const PAGE_SIZE = 5;

const fromDatastore = (item) => {
    item.id = item[Datastore.KEY].id;
    return item;
}

const getKey = (item_key, item_id) => {
    return datastore.key([item_key, parseInt(item_id, 10)]);
}

const postItem = (item_key, item) => {
    var key = datastore.key(item_key);
    return datastore.save({
        'key': key,
        'data': item
    }).then(() => {
        return key;
    });
}

const getPage = (item_key, cursor=null) => {
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

const getItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.get(key).then((entity) => {
        if(entity[0] === undefined || entity[0] === null) return null;
        else return entity.map(fromDatastore)[0];
    });
}

const deleteItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.delete(key);
}

const putItem = (item_key, item_id, item) => {
    var key = getKey(item_key, item_id);
    return datastore.save({
        'key': key,
        'data': item
    }).then(() => {
        return key;
    });
}

const querySelect = (item_key, property_key, evaluator, property_value, cursor=null) => {
    const query = datastore.createQuery(item_key).filter(new PropertyFilter(property_key, evaluator, property_value));
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

module.exports = {postItem, getPage, getItem, deleteItem, putItem, querySelect}
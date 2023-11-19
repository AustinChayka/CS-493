const {Datastore, PropertyFilter} = require('@google-cloud/datastore');
const datastore = new Datastore();

const BOAT = 'boat';

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

const deleteItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.delete(key);
}

const querySelect = (item_key, property_key, property_value) => {
    const query = datastore.createQuery(item_key).filter(new PropertyFilter(property_key, '=', property_value));
    return datastore.runQuery(query).then((items) => {
        return items[0].map(fromDatastore);
    });
}

const getItem = (item_key, item_id) => {
    var key = getKey(item_key, item_id);
    return datastore.get(key).then((entity) => {
        if(entity[0] === undefined || entity[0] === null) return null;
        else return entity.map(fromDatastore)[0];
    });
}

module.exports = {BOAT, postItem, deleteItem, querySelect, getItem}
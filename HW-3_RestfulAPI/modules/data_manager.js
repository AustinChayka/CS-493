const {Datastore, PropertyFilter} = require('@google-cloud/datastore');
const datastore = new Datastore();

const SLIP = 'slip';
const BOAT = 'boat';

from_datastore = (item) => {
    item.id = item[Datastore.KEY].id;
    return item;
}

post_item = (item_key, item) => {
    var key = datastore.key(item_key);
    return datastore.save({
        'key': key,
        'data': item
    }).then(() => {
        return key;
    });
}

get_items = (item_key) => {
    const query = datastore.createQuery(item_key);
    return datastore.runQuery(query).then((items) => {
        return items[0].map(from_datastore);
    });
}

get_item = (item_key, item_id) => {
    const key = datastore.key([item_key, parseInt(item_id, 10)]);
    return datastore.get(key).then((item) => {
        if(item[0] === undefined || item[0] === null) return null;
        else return item.map(from_datastore)[0];
    });
}

patch_item = (item_key, item_id, item) => {
    const key = datastore.key([item_key, parseInt(item_id, 10)]);
    return datastore.get(key).then((old_item) => {
        if(old_item[0] === undefined || old_item[0] === null) return null;
        else return datastore.save({
            'key': key,
            'data': item
        }).then(() => {
            return key;
        })
    });
}

delete_item = (item_key, item_id) => {
    const key = datastore.key([item_key, parseInt(item_id, 10)]);
    return datastore.delete(key);
}

query_select = (item_key, property_key, property_value) => {
    const query = datastore.createQuery(item_key).filter(new PropertyFilter(property_key, '=', property_value));
    return datastore.runQuery(query).then((items) => {
        return items[0].map(from_datastore);
    });
}

module.exports = {BOAT, SLIP, post_item, get_items, get_item, patch_item, delete_item, query_select}
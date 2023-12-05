const dm = require('./data_manager.js');

const DIAGNOSTIC_FEATURES_LIMIT = 256;

const newMeta = (user_id) => {
    return {
        owner: user_id,
        time: Date.now()
    }
}

const newFamily = (user_id, data_body) => {
    const id = -1;
    return {
        id: id,
        name: data_body.name,
        diagnostic_features: '',
        genera: [],
        verified: data_body.hasOwnProperty('verified') ? data_body.verified : false,
        meta: newMeta(user_id)
    }
}

const newGenus = (user_id, data_body) => {
    const id = -1;
    return {
        id: id,
        name: data_body.name,
        diagnostic_features: '',
        family: null,
        species: [],
        verified: data_body.hasOwnProperty('verified') ? data_body.verified : false,
        meta: newMeta(user_id)
    }
}

const newSpecies = (user_id, data_body) => {
    const id = -1;
    return {
        id: id,
        name: data_body.name,
        diagnostic_features: '',
        genus: null,
        common_names: data_body.hasOwnProperty('common_names') ? data_body.common_names : [],
        verified: data_body.hasOwnProperty('verified') ? data_body.verified : false,
        meta: newMeta(user_id)
    }
}

const newObservation = (user_id, data_body, species_id=null, genus_id=null, family_id=null) => {
    const id = -1;
    return {
        id: id,
        species: species_id,
        genus: genus_id,
        family: family_id,
        verified: data_body.hasOwnProperty('verified') ? data_body.verified : false,
        location: data_body.location,
        image: data_body.hasOwnProperty('image_url') ? data_body.image_url : null,
        meta: newMeta(user_id)
    }
}

const families_config = {
    path: 'families',
    id_prefix: 'FAM',
    key: 'FAMILY',
    property_filters: [
        {
            target_property: 'name',
            required: true,
            filters: [
                {
                    filter_function: (name) => {
                        return name.slice(-5) === 'aceae'
                    },
                    error_message: "family name must end in 'aceae'"
                },
                {
                    filter_function: (name) => {
                        return !/[^a-z]/i.test(name);
                    },
                    error_message: 'family name must only contain letters'
                }, 
                {
                    filter_function: async (name) => {
                        const results = await dm.querySelect('FAMILY', 'name', '=', name);
                        return results.items.length === 0;
                    },
                    error_message: 'family name must be unique'
                }
            ]
        }, 
        {
            target_property: 'verified',
            required: false,
            filters: [
                {
                    filter_function: (verified) => {
                        return typeof verified === 'boolean';
                    },
                    error_message: 'verified must be boolean'
                }
            ]
        },
        {
            target_property: 'diagnostic_features',
            required: false,
            filters: [
                {
                    filter_function: (diagnostic_features) => {
                        return typeof diagnostic_features === 'string';
                    },
                    error_message: 'diagnostic features must be a string'
                },
                {
                    filter_function: (diagnostic_features) => {
                        return diagnostic_features.length <= DIAGNOSTIC_FEATURES_LIMIT;
                    },
                    error_message: `diagnostic features exceets charater limit of ${DIAGNOSTIC_FEATURES_LIMIT}`
                }
            ]  
        }
    ],
    constructor: newFamily,
}

const genera_config = {
    path: 'genera',
    id_prefix: 'GEN',
    key: 'GENUS',
    property_filters: [
        {
            target_property: 'name',
            required: true,
            filters: [
                {
                    filter_function: (name) => {
                        return !/[^a-z]/i.test(name);
                    },
                    error_message: 'genus name must only contain letters'
                }, 
                {
                    filter_function: async (name) => {
                        const results = await dm.querySelect('GENUS', 'name', '=', name);
                        return results.items.length === 0;
                    },
                    error_message: 'genus name must be unique'
                }
            ]
        },
        {
            target_property: 'verified',
            required: false,
            filters: [
                {
                    filter_function: (verified) => {
                        return typeof verified === 'boolean';
                    },
                    error_message: 'verified must be boolean'
                }
            ]
        },
        {
            target_property: 'diagnostic_features',
            required: false,
            filters: [
                {
                    filter_function: (diagnostic_features) => {
                        return typeof diagnostic_features === 'string';
                    },
                    error_message: 'diagnostic features must be a string'
                },
                {
                    filter_function: (diagnostic_features) => {
                        return diagnostic_features.length <= DIAGNOSTIC_FEATURES_LIMIT;
                    },
                    error_message: `diagnostic features exceets charater limit of ${DIAGNOSTIC_FEATURES_LIMIT}`
                }
            ]  
        }
    ],
    constructor: newGenus
}

const species_config = {
    path: 'species',
    id_prefix: 'SPC',
    key: 'SPECIES',
    property_filters: [
        {
            target_property: 'name',
            required: true,
            filters: [
                {
                    filter_function: (name) => {
                        return !/[^a-z]/i.test(name);
                    },
                    error_message: 'species name must only contain letters'
                }, 
                {
                    filter_function: async (name) => {
                        const results = await dm.querySelect('SPECIES', 'name', '=', name);
                        return results.items.length === 0;
                    },
                    error_message: 'species name must be unique'
                }
            ]
        },
        {
            target_property: 'verified',
            required: false,
            filters: [
                {
                    filter_function: (verified) => {
                        return typeof verified === 'boolean';
                    },
                    error_message: 'verified must be boolean'
                }
            ]
        }, 
        {
            target_property: 'common_names',
            required: false,
            filters: [
                {
                    filter_function: (common_names) => {
                        return Array.isArray(common_names);
                    },
                    error_message: 'common names be an array'
                },
                {
                    filter_function: (common_names) => {
                        common_names.forEach((name) => {
                            if(typeof name !== 'string') return false;
                        });
                        return true;
                    },
                    error_message: 'common names must be strings'
                }
            ]  
        },
        {
            target_property: 'diagnostic_features',
            required: false,
            filters: [
                {
                    filter_function: (diagnostic_features) => {
                        return typeof diagnostic_features === 'string';
                    },
                    error_message: 'diagnostic features must be a string'
                },
                {
                    filter_function: (diagnostic_features) => {
                        return diagnostic_features.length <= DIAGNOSTIC_FEATURES_LIMIT;
                    },
                    error_message: `diagnostic features exceets charater limit of ${DIAGNOSTIC_FEATURES_LIMIT}`
                }
            ]  
        }
    ],
    constructor: newSpecies
}

const observations_config = {
    path: 'observations',
    id_prefix: 'OBS',
    key: 'Observation',
    property_filters: [
        {
            target_property: 'location',
            required: true,
            filters: [
                {
                    filter_function: (location) => {
                        return ['country', 'state', 'zip'].every(item => location.hasOwnProperty(item));
                    },
                    error_message: "location must have all properties: [country, state, zip]"
                },
                {
                    filter_function: (location) => {
                        return ['country', 'state'].every(item => typeof location[item] === 'string');
                    },
                    error_message: "location properties: [country, state] must be strings"
                },
                {
                    filter_function: (location) => {
                        return typeof location.zip === 'number';
                    },
                    error_message: "location property: 'zip' must be number"
                }
            ]
        }, 
        {
            target_property: 'verified',
            required: false,
            filters: [
                {
                    filter_function: (verified) => {
                        return typeof verified === 'boolean';
                    },
                    error_message: 'verified must be boolean'
                }
            ]
        },
        {
            target_property: 'image_url',
            required: false,
            filters: [
                {
                    filter_function: (url) => {
                        return typeof url === 'string';
                    },
                    error_message: 'image url must be string'
                }
            ]
        }
    ],
    constructor: newObservation,
}

module.exports = {newMeta, families_config, genera_config, species_config, observations_config}
const crypto = require('node:crypto');
const dm = require('./data_manager.js');

const STATE_SIZE = 32;
const STATE_LIFETIME = 30 * 1000;

const generateState = async () => {
    const token = (await crypto.randomBytes(STATE_SIZE)).toString('hex');
    return {
        state_token: token,
        created: Date.now()
    };
}

const buildRedirectURI = (req) => {
    return req.protocol + '://' + req.get('host') + '/oauth';
}

const logState = async (state) => {
    const key = await dm.postItem(dm.STATE, state);
    return key;
}

const newStateToken = async () => {
    const state = await generateState();
    await logState(state);
    return state.state_token;
}

const validateLoggedStates = async () => {
    const expiration_time = Date.now() - STATE_LIFETIME; 
    const expired = await dm.querySelect(dm.STATE, 'created', '<', expiration_time);
    await Promise.allSettled(expired.map(async (state) => {
        await dm.deleteItem(dm.STATE, state.id);
    }));
}

const checkState = async (state_token) => {
    await validateLoggedStates();
    const selected = await dm.querySelect(dm.STATE, 'state_token', '=', state_token);
    return (selected.length === 1); 
}

module.exports = {newStateToken, buildRedirectURI, checkState}
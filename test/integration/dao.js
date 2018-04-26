function getAssets(ids, { language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(ids.map(id => ({ id, language }))), 50 + (ids.length * 5));
    });
}

function getEmptyGroup({ group, language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve([]), 100);
    });
}

function getErroredRequest({}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { throw new Error('Something went wrong'); }, 100);
    });
}

function getFailedRequest({}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject({ error: 'Something went wrong' }), 100);
    });
}

module.exports = {
    getAssets,
    getEmptyGroup,
    getErroredRequest,
    getFailedRequest,
};

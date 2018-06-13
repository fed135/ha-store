function getAssets(ids, { language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(ids.map(id => ({ id, language }))), 20);
    });
}

function getEmptyGroup(ids, { language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve([]), 10);
    });
}

function getPartialGroup(ids, { language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve([{ id: ids[0], language }]), 5);
    });
}

function getErroredRequest(ids, { language }) {
    return new Promise((resolve, reject) => {
        throw new Error('Something went wrong');
    });
}

function getFailedRequest(ids, { language }) {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject({ error: 'Something went wrong' }), 10);
    });
}

module.exports = {
    getAssets,
    getEmptyGroup,
    getPartialGroup,
    getErroredRequest,
    getFailedRequest,
};

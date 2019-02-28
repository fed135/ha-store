function simulateNetwork() {
    let tick = 0;
    while(true) {
        if (++tick > 0xffff) break;
    }
    return true;
}

function calculateResponseTime(numItems) {
    return Math.round(30 + numItems * 0.5);
}

function getAssets(ids, { language }) {
    return new Promise((resolve, reject) => {
        simulateNetwork();
        setTimeout(() => resolve(ids.map(id => ({ id, language }))), calculateResponseTime(ids.length));
    });
}

function getErroredRequest(ids, { language }) {
    return new Promise((resolve, reject) => {
      throw new Error('Something went wrong');
    });
}

module.exports = {
    getAssets,
    getErroredRequest,
};

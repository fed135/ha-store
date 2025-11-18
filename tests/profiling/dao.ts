function simulateNetwork() {
  let tick = 0;
  while(true) { // eslint-disable-line
    if (++tick > 0xffff) break;
  }
  return true;
}

function calculateResponseTime(numItems) {
  return Math.round(30 + numItems * 0.5);
}

function getAssets(ids, { language }) {
  return new Promise((resolve) => {
    simulateNetwork();
    setTimeout(() => resolve(ids.reduce((acc, id) => {
      acc[id] = { id, language };
      return acc;
    }, {})
    ), calculateResponseTime(ids.length));
  });
}

function getErroredRequest() {
  return new Promise(() => {
    throw new Error('Something went wrong');
  });
}

module.exports = {
  getAssets,
  getErroredRequest,
};

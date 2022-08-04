function getAssets(ids, { language }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ids.reduce((acc, id) => {
      acc[id] = { id, language: language || null };
      return acc;
    }, {})), (ids.length > 1) ? 130 : 100);
  });
}

function getEmptyGroup() {
  return new Promise((resolve) => {
    setTimeout(() => resolve([]), 10);
  });
}

function getPartialGroup(ids, { language }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ [ids[0]]: { id: ids[0], language: language || null }}), 5);
  });
}

function getFailOnFoo(ids, params) {
  if (ids[0] === 'foo') return getErroredRequest();
  return getAssets(ids, params);
}

function getErroredRequest() {
  return new Promise(() => {
    throw new Error('Something went wrong');
  });
}

function getFailedRequest() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject({ error: 'Something went wrong' }), 10);
  });
}

function getSlowRequest(ids, { language }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ids.reduce((acc, id) => {
      acc[id] = { id, language };
      return acc;
    }, {})), 1000);
  });
}

module.exports = {
  getAssets,
  getEmptyGroup,
  getPartialGroup,
  getErroredRequest,
  getFailedRequest,
  getFailOnFoo,
  getSlowRequest,
};

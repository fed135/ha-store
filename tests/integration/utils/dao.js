function getAssets(ids, { language }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ids.map(id => ({ id, language }))), (ids.length > 1) ? 130 : 100);
  });
}

function getEmptyGroup() {
  return new Promise((resolve) => {
    setTimeout(() => resolve([]), 10);
  });
}

function getPartialGroup(ids, { language }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve([{ id: ids[0], language }]), 5);
  });
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
    setTimeout(() => resolve(ids.map(id => ({ id, language }))), 1000);
  });
}

module.exports = {
  getAssets,
  getEmptyGroup,
  getPartialGroup,
  getErroredRequest,
  getFailedRequest,
  getSlowRequest,
};

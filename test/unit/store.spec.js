const astore = require('../src');
const expect = require('chai').expect;

const testDuration = 100;

const testDao = {
  getOne: (opts) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          id: opts.id,
          stuff: 'yes',
        })
      }, testDuration);
    });
  },
  search: (opts) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([
          {
            id: 123,
            stuff: 'yes',
          },
          {
            id: 456,
            stuff: 'yes',
          },
        ])
      }, testDuration);
    });
  },
  searchIndexed: (opts) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          '123': {
            id: 123,
            stuff: 'yes',
          },
          '456': {
            id: 456,
            stuff: 'yes',
          },
        })
      }, testDuration);
    });
  },
  searchIndexedNull: (opts) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          '123': {
            id: 123,
            stuff: 'yes',
          },
          '456': null,
        })
      }, testDuration);
    });
  },
};

describe('Smoke test, single', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao);
  });

  it('should cache entities', (done) => {
    let now = Date.now();
    testStore.get({ id: 123 }, 'getOne')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.get.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.most(1);
        now = Date.now();
        done();
      });
  });
});

describe('Smoke test, single - disabled', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao, { enabled: false });
  });

  it('should make a direct calls', (done) => {
    let now = Date.now();
    testStore.get({ id: 123 }, 'getOne')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.get.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
        done();
      });
  });
});

describe('Smoke test, list', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao);
  });

  it('should cache entities individually', (done) => {
    let now = Date.now();
    testStore.getList({ ids: [123, 456] }, 'getOne')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.getList.bind(null, { ids: [123, 456] }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.most(1);
        now = Date.now();
        done();
      });
  });
});


describe('Smoke test, search', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao);
  });

  it('should cache entities', (done) => {
    let now = Date.now();
    testStore.search({ }, 'search')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.get.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.most(1);
        now = Date.now();
        done();
      });
  });
});

describe('Smoke test, search indexed', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao);
  });

  it('should cache entities', (done) => {
    let now = Date.now();
    testStore.search({ }, 'searchIndexed')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.get.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.most(1);
        now = Date.now();
        done();
      });
  });
  
  it('should handle null entities', (done) => {
    let now = Date.now();
    testStore.search({ }, 'searchIndexedNull')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.get.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.most(1);
        now = Date.now();
        done();
      });
  });
});

describe('Smoke test, direct', () => {

  let testStore;
  beforeEach(() => {
    testStore = astore(testDao);
  });

  it('should cache entities', (done) => {
    let now = Date.now();
    testStore.direct({ id: 123 }, 'getOne')
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
      })
      .then(testStore.direct.bind(null, { id: 123 }, 'getOne'))
      .then(() => {
        expect((Date.now() - now)).to.be.at.least(testDuration - 1);
        now = Date.now();
        done();
      });
  });
});
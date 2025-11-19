export function getAssets(ids: string[], { language }: any = {}) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ids.reduce((acc, id) => {
      acc[id] = { id, language: language || null };
      return acc;
    }, {} as any)), (ids.length > 1) ? 130 : 100);
  });
}

export function getEmptyGroup() {
  return new Promise((resolve) => {
    setTimeout(() => resolve([]), 10);
  });
}

export function getPartialGroup(ids: string[], { language }: any = {}) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ [ids[0]]: { id: ids[0], language: language || null } }), 5);
  });
}

export function getFailOnFoo(ids: string[], params: any) {
  if (ids[0] === 'foo') return getErroredRequest();
  return getAssets(ids, params);
}

export function getErroredRequest() {
  return new Promise(() => {
    throw new Error('Something went wrong');
  });
}

export function getFailedRequest() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject({ error: 'Something went wrong' }), 10);
  });
}

export function getSlowRequest(ids: string[], { language }: any = {}) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ids.reduce((acc, id) => {
      acc[id] = { id, language };
      return acc;
    }, {} as any)), 1000);
  });
}

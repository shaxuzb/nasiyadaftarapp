import { isServerMutationMethod } from './networkState.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(isServerMutationMethod('post'), 'POST is a server mutation');
assert(isServerMutationMethod('PUT'), 'PUT is a server mutation');
assert(isServerMutationMethod('patch'), 'PATCH is a server mutation');
assert(isServerMutationMethod('delete'), 'DELETE is a server mutation');
assert(!isServerMutationMethod('get'), 'GET is not a server mutation');
assert(!isServerMutationMethod(undefined), 'missing method is not treated as a mutation');

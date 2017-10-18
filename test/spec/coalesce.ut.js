import coalesce from '../../lib/coalesce';
import defer from 'promise-defer';
import clone from 'lodash/cloneDeep';

const VERBS = [
    'options',
    'GET',
    'HEAD',
    'PUT',
    'POST',
    'DELETE',
    'PATCH',
];

const CACHED_VERBS = [
    'options',
    'GET',
    'HEAD',
];

const UNCACHED_VERBS = VERBS.filter(verb => CACHED_VERBS.indexOf(verb) < 0);

describe('coalesce(config)', () => {
    it('should exist', () => {
        expect(coalesce).toEqual(jasmine.any(Function));
    });

    describe('when executed', () => {
        let config;
        let hof;

        beforeEach(() => {
            config = {
                methods: CACHED_VERBS,
            };

            hof = coalesce(config);
        });

        afterEach(() => {
            config = null;
            hof = null;
        });

        it('should return a Function', () => {
            expect(hof).toEqual(jasmine.any(Function));
        });

        describe('and the result is executed', () => {
            let fetch;
            let coalesced;
            let deferred;

            beforeEach(() => {
                fetch = jasmine.createSpy('fetch()').and.callFake(() => (deferred = defer()).promise);

                coalesced = hof(fetch);
            });

            afterEach(() => {
                fetch = null;
                coalesced = null;
                deferred = null;
            });

            it('should return a Function', () => {
                expect(coalesced).toEqual(jasmine.any(Function));
            });

            UNCACHED_VERBS.forEach(verb => describe(`if the request is a ${verb}`, () => {
                let url;
                let options;

                beforeEach(() => {
                    url = '/foo/bar';
                    options = {
                        method: verb,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                });

                afterEach(() => {
                    url = null;
                    options = null;
                });

                it('should call through to fetch every time', () => {
                    const one = coalesced(url, options);
                    const two = coalesced(url, options);

                    fetch.calls.all().forEach(call => expect(call.args).toEqual([new Request(url, options)]));
                    expect(fetch.calls.count()).toBe(2, 'fetch() not called the correct number of times.');
                    expect(one).toBe(fetch.calls.all()[0].returnValue);
                    expect(two).toBe(fetch.calls.all()[1].returnValue);
                });
            }));

            CACHED_VERBS.forEach(verb => describe(`if the request is a ${verb}`, () => {
                let url;
                let options;
                let result;

                beforeEach(() => {
                    url = '/foo/bar';
                    options = {
                        method: verb.toUpperCase(),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };

                    result = coalesced(url, options);
                });

                afterEach(() => {
                    url = null;
                    options = null;
                    result = null;
                });

                it('should call fetch()', () => {
                    expect(fetch).toHaveBeenCalledWith(new Request(url, options));
                });

                describe('if called again with the same args', () => {
                    let secondResult;

                    beforeEach(() => {
                        fetch.calls.reset();

                        secondResult = coalesced(url, options);
                    });

                    it('should not call fetch()', () => {
                        expect(fetch).not.toHaveBeenCalled();
                    });

                    describe('when the request succeeds', () => {
                        let response;
                        let first;
                        let second;

                        beforeEach(done => {
                            first = jasmine.createSpy('first()');
                            result.then(first);

                            second = jasmine.createSpy('second()');
                            secondResult.then(second);

                            response = {
                                status: 200,
                                statusText: 'OK',
                                clone: jasmine.createSpy('response.clone()').and.callFake(function cloneResponse() {
                                    return clone(this);
                                }),
                            };

                            deferred.resolve(response);
                            setTimeout(done);
                        });

                        afterEach(() => {
                            response = null;
                            first = null;
                            second = null;
                        });

                        it('should fulfill with a clone of the response', () => {
                            expect(response.clone).toHaveBeenCalledWith();

                            expect(first).toHaveBeenCalledWith(response);
                            expect(second).toHaveBeenCalledWith(response);

                            expect(first.calls.mostRecent().args[0]).toBe(response.clone.calls.all()[0].returnValue);
                            expect(second.calls.mostRecent().args[0]).toBe(response.clone.calls.all()[1].returnValue);
                        });

                        describe('the next time a request is made', () => {
                            beforeEach(() => {
                                fetch.calls.reset();
                                secondResult = coalesced(url, options);
                            });

                            it('should call fetch()', () => {
                                expect(fetch).toHaveBeenCalledWith(new Request(url, options));
                            });
                        });
                    });

                    describe('when the request fails', () => {
                        let reason;
                        let failure;

                        beforeEach(done => {
                            reason = new Error('Something bad happened.');

                            failure = jasmine.createSpy('failure()');
                            secondResult.catch(failure);

                            deferred.reject(reason);
                            setTimeout(done);
                        });

                        afterEach(() => {
                            reason = null;
                            failure = null;
                        });

                        it('should reject with the reason', () => {
                            expect(failure).toHaveBeenCalledWith(reason);
                        });

                        describe('the next time a request is made', () => {
                            beforeEach(() => {
                                fetch.calls.reset();
                                secondResult = coalesced(url, options);
                            });

                            it('should call fetch()', () => {
                                expect(fetch).toHaveBeenCalledWith(new Request(url, options));
                            });
                        });
                    });

                    describe('but a differently-cased method', () => {
                        beforeEach(() => {
                            fetch.calls.reset();

                            options.method = options.method.toLowerCase();
                        });

                        it('should not call fetch()', () => {
                            expect(fetch).not.toHaveBeenCalled();
                            expect(coalesced(url, options)).toEqual(jasmine.any(Promise));
                        });
                    });
                });

                describe('if called again with a different URL', () => {
                    beforeEach(() => {
                        fetch.calls.reset();

                        url += 'a';

                        coalesced(url, options);
                    });

                    it('should call fetch()', () => {
                        expect(fetch).toHaveBeenCalledWith(new Request(url, options));
                    });
                });

                describe('if called again with different options', () => {
                    beforeEach(() => {
                        fetch.calls.reset();

                        options.headers.Accept = 'application/json';

                        coalesced(url, options);
                    });

                    it('should call fetch()', () => {
                        expect(fetch).toHaveBeenCalledWith(new Request(url, options));
                    });
                });
            }));

            describe('if no method is specified', () => {
                let url;

                beforeEach(() => {
                    url = '/api/campaigns';
                });

                afterEach(() => {
                    url = null;
                });

                it('should be treated like a GET', () => {
                    coalesced(url);
                    coalesced(url, { method: 'GET' });

                    expect(fetch.calls.count()).toBe(1);
                });
            });
        });

        describe('if no config is provided', () => {
            let coalesced;
            let fetch;

            beforeEach(() => {
                fetch = jasmine.createSpy('fetch()').and.callFake(() => new Promise(() => {}));

                coalesced = coalesce()(fetch);
            });

            afterEach(() => {
                coalesced = null;
                fetch = null;
            });

            it('should cache idempotent verbs', () => {
                [
                    'OPTIONS',
                    'GET',
                    'HEAD',
                    'PUT',
                    'DELETE',
                ].forEach(verb => {
                    fetch.calls.reset();
                    coalesced('foo', { method: verb });
                    coalesced('foo', { method: verb });

                    expect(fetch.calls.count()).toBe(1);
                });
            });

            it('should not cache non-idempotent verbs', () => {
                [
                    'POST',
                    'PATCH',
                ].forEach(verb => {
                    fetch.calls.reset();
                    coalesced('foo', { method: verb });
                    coalesced('foo', { method: verb });

                    expect(fetch.calls.count()).toBe(2);
                });
            });
        });
    });
});

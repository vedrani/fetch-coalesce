import coalesce from '../../lib/coalesce';
import defer from 'promise-defer';

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


                    fetch.calls.all().forEach(call => expect(call.args).toEqual([url, options]));
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
                    expect(fetch).toHaveBeenCalledWith(url, options);
                    expect(result).toBe(fetch.calls.mostRecent().returnValue);
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

                    it('should return the existing Promise', () => {
                        expect(secondResult).toBe(result);
                    });

                    ['resolve', 'reject'].forEach(action => describe(`after the first Promise ${action}s`, () => {
                        beforeEach(done => {
                            fetch.calls.reset();

                            deferred[action]();

                            setTimeout(() => {
                                secondResult = coalesced(url, options);
                                done();
                            });
                        });

                        it('should call fetch()', () => {
                            expect(fetch).toHaveBeenCalledWith(url, options);
                            expect(secondResult).toBe(fetch.calls.mostRecent().returnValue);
                        });
                    }));

                    describe('but a differently-cased method', () => {
                        beforeEach(() => {
                            fetch.calls.reset();

                            options.method = options.method.toLowerCase();
                        });

                        it('should not call fetch()', () => {
                            expect(fetch).not.toHaveBeenCalled();
                            expect(coalesced(url, options)).toBe(result);
                        });
                    });
                });

                describe('if called again with a different URL', () => {
                    let secondResult;

                    beforeEach(() => {
                        fetch.calls.reset();

                        url += 'a';

                        secondResult = coalesced(url, options);
                    });

                    it('should call fetch()', () => {
                        expect(fetch).toHaveBeenCalledWith(url, options);
                        expect(secondResult).toBe(fetch.calls.mostRecent().returnValue);
                    });
                });

                describe('if called again with different options', () => {
                    let secondResult;

                    beforeEach(() => {
                        fetch.calls.reset();

                        options.headers.Accept = 'application/json';

                        secondResult = coalesced(url, options);
                    });

                    it('should call fetch()', () => {
                        expect(fetch).toHaveBeenCalledWith(url, options);
                        expect(secondResult).toBe(fetch.calls.mostRecent().returnValue);
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
                    expect(coalesced(url)).toBe(coalesced(url, { method: 'GET' }));
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
                ].forEach(verb => expect(coalesced('foo', { method: verb })).toBe(coalesced('foo', { method: verb })));
            });

            it('should not cache non-idempotent verbs', () => {
                [
                    'POST',
                    'PATCH',
                ].forEach(verb => expect(coalesced('foo', { method: verb })).not.toBe(coalesced('foo', { method: verb })));
            });
        });
    });
});

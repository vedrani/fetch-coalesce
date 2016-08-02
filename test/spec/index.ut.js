import index from '../../index';
import coalesce from '../../lib/coalesce';

describe('index', () => {
    it('should be the coalesce() function', () => {
        expect(index).toBe(coalesce);
    });
});

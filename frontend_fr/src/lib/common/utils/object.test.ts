import { deepClone } from './object';

describe('deepClone', () => {
  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });
});

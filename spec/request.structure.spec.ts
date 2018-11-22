import { HttpRequest } from './../src/httprequest';

describe('HttpRequest<TestDataType>', () => {
  const fakeRet = { 'id': 11, 'name': 'mike' }
  const httpReq_Simple = new HttpRequest<any>('http://localhost/fake');
  const httpReq_Stream = new HttpRequest<any>('http://localhost/fake');

  beforeAll(() => {
    spyOn(httpReq_Simple, '_fetch').and.callFake(() => {
      return new Promise((resolve, _reject) => {
        resolve({ json: () => fakeRet });
      })

    });

    spyOn(httpReq_Stream, '_fetch').and.callFake(() => {
      return new Promise((resolve, _reject) => {
        resolve({ json: () => fakeRet });
        resolve({ json: () => fakeRet });
      })

    });

  });

  it('can complete a simple request/response cycle', (done) => {
    httpReq_Simple
      .fetch()
      .subscribe((response) => {
        expect(response).toBe(fakeRet);
        done();
      });

  });

  it('generates a retry interval inside the range', () => {
    for (var i = 0; i < 10000; i++) {
      const delay = httpReq_Simple.retryTimeDelay();
      expect(delay).toBeGreaterThanOrEqual(2500);
      expect(delay).toBeLessThanOrEqual(10000);
    }

  });

});

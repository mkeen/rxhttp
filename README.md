# 👋 RxHttp
HTTP (fetch) Client for TypeScript that supports real-time JSON streams and good ol' fashioned request/response. Powered by RxJS. Requests are automatically retried indefinitely and optimized (staggererd) for high-load use-cases. Retries can be transparent to your implementation. By default, the observable will give you data whenever the request succeeds.  
  
### Why?
Fetch is the most modern API for making http requests (both long lived (streams) and traditional (simple). JSON is the best way to communicate with back end services. And RxJS is the best API for building, chaining, and consuming asyncronous requests. So, RxHttp was created! It is the back end for [rxcouch](https://www.npmjs.com/package/@mkeen/rxcouch), the dopest client and server side library for interacting with CouchDB.  

### Features
📀 **Universal** -- Works on both NodeJS and Browser  

🌊 **Real-time** -- Long-lived real-time JSON streams (`ReadableStream` in Browser, `Buffer` in NodeJS)  

💪 **TypeScript first** -- Typed responses  

🆘 **Simple lifecycle** -- Simple request lifecycle uses `Observable` callback functions (`next`, `error`, and `complete`)  

### Install
`npm install @mkeen/rxhttp`  
https://www.npmjs.com/package/@mkeen/rxhttp  

### Generate Docs
`yarn run doc`  

### Streaming Request Example

```typescript
import { HttpRequest,                                           // Base class you'll interact with
FetchBehavior                                                   // Toggle simple (req/response) vs stream
} from '@mkeen/rxhttp';               

interface Person {
  name: string;
  email: string;
}

// This endpoint sends a `Person` and then stays open, and then sends a new `Person` every second.
let personRequest = new HttpRequest<Person>(                   // When you initialize the class, you can
  'https://localhost/person', {                                // specify a type for replies and stream frames
    method: 'POST',                                            // Method Default: 'GET'
    body: JSON.stringify({                                     // Body Default: `undefined`, not required
      'id': 1
    })
    
  }, FetchBehavior.stream                                      // Behavior Default: simple
)
.fetch()
.subscribe(
  (incoming_data: Person) => {
    console.log('got person: ', incoming_data);
  },
  
  (error: any) => {
    console.error('connection issue');
  },
  
  () => {
    console.log('connection closed');
  }
);

setTimeout(() => {
  personRequest.reconfigure('https://localhost/person', {
    method: 'POST',
    body: JSON.stringify({
      id: 2
    });
  
  });

}, 2000)

// Output:
got person: , {id: 1 ...
got person: , {id: 1 ...
got person: , {id: 1 ...
got person: , {id: 2 ...
got person: , {id: 2 ...
got person: , {id: 2 ...
got person: , {id: 2 ...
got person: , {id: 2 ...
got person: , {id: 2 ...
...
```
  
### Simple (Request/Response) Request Example
```typescript
import { HttpRequest } from '@mkeen/rxhttp';

// This endpoint returns some json object
new HttpRequest<any>(
  'https://localhost/simple', {
    method: 'GET'
  }
  
)
.fetch()
.subscribe(
  (incoming_data: any) => console.log('received response, connection closed', incoming_data);
);

// Output:
received response, connection closed , {...}
```
  
🇺🇸  

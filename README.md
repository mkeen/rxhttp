# 👋 RxHttp
HTTP Client that uses Fetch API built with TypeScript that supports real-time JSON streams and good ol' fashioned request/response. It runs in NodeJS and Browser. It's powered by RXJS.

### Why?
The Fetch API is the modern API for making http requests -- both long lived (streams) and traditional (simple). And RxJS is the makes it extremely convenient to build, chain, and consume asyncronous streams.

### Features
📀 **Universal** -- Works on both NodeJS and Browser

🌊 **Real-time** -- Supports long-lived real-time Chunked JSON streams

🆘 **Complete lifecycle** -- Simple request lifecycle uses `Observable` callback functions (`next`, `error`, and `complete`). Once the connection completes, or all subscribers have unsubbed, the connection will be cleaned up to ensure there aren't any memory leaks.

### Install
`npm install @mkeen/rxhttp`  
https://www.npmjs.com/package/@mkeen/rxhttp  

### Generate Docs
`npm run doc`  

### The Most Bare Bones Example With Defaults 

```typescript
import { HttpRequest } from '@mkeen/rxhttp';

new HttpRequest<any>('https://localhost/simple')
.subscribe(
  response => console.log('received response, connection closed', incoming_data);
);

// Output:
// received response, connection closed , {...}
```

### Simple (Request/Response) Request Example
```typescript
import { HttpRequest, FetchBehavior } from '@mkeen/rxhttp';

interface Person {
  name: string;
  email: string;
}

new HttpRequest<Person>(
  'https://localhost/person',
  { method: 'POST', body: {
    email: 'mwk@mikekeen.com',
    name: 'Mike Keen'
  } },
  FetchBehavior.simple
)
.fetch()
.subscribe(
  response => console.log('person created successfully, connection closed', response)
);

// Output:
// person created successfully, connection closed, {...}
```

### Simple (Request/Response) Request With Error Handling Example

```typescript
import { HttpRequest, FetchBehavior } from '@mkeen/rxhttp';

interface Person {
  name: string;
  email: string;
}

new HttpRequest<Person>(
  'https://localhost/person',
  { method: 'POST', body: {
    email: 'mwk@mikekeen.com',
    name: 'Mike Keen'
  } },
  FetchBehavior.simple
)
.fetch()
.subscribe(
 (response: Person) => {
    console.log('person created successfully, connection closed', incoming_data);
  },
  
  (error: any) => {
    console.error('http error');
  },
  
  () => {
    console.log('connection closed');
  }
);

// Output:
// person created successfully, connection closed, {...}
```

### 

### Streaming Request Example

```typescript
import { HttpRequest, FetchBehavior} from '@mkeen/rxhttp';               

interface Person {
  name: string;
  email: string;
}

const personStream = new HttpRequest<Person>(
  'https://localhost/person', {
    method: 'GET'
  }, FetchBehavior.stream
)
.fetch()
.subscribe(
  (incoming_data: Person) => {
    console.log('got person update: ', incoming_data);
  },
  
  (error: any) => {
    console.error('http error');
  },
  
  () => {
    console.log('connection closed');
  }
);

// Output:
// got person update: , {id: 1 ...
// got person update: , {id: 2 ...
// got person update: , {id: 1 ...
// ...
```

### License

ISC (BSD 2 / MIT) - Enjoy

🇺🇸  
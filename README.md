# 👋 RxHttp
HTTP (fetch) Client for TypeScript that supports real-time JSON streams and good ol' fashioned request/response. Powered by RxJS.

### Features
🌊 Long-lived real-time JSON streams  
🚁 In-flight configuration changes  
💪 Typed responses  

### Coming Soon
🆘 Retry facilities  
💯 Test coverage

https://www.npmjs.com/package/@mkeen/rxhttp  

install: `yarn add @mkeen/rxhttp`

generate docs: `yarn run doc`

### Examples

```
import { HttpRequest, FetchBehavior } from '@mkeen/rxhttp';

interface Person {
  name: string;
  email: string;
}

let person = new HttpRequest<Person>(
  'https://localhost/person', {
    method: 'POST',
    body: JSON.stringify({
      'id': 1
    })
    
  }, FetchBehavior.stream
)
.fetch()
.subscribe(
  (incoming_data: Person) => console.log('got person: ', incoming_data);
);

// Reconfigure the request in-flight. Change URL, method, body, headers, whatever...
person.reconfigure('https://localhost/person', {
  method: 'POST',
  body: JSON.stringify({
    'id': 2
  });
  
});

// Output:
got person: , ...
got person: , ...
```
  
  
```
import { HttpRequest } from '@mkeen/rxhttp';

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
received response, connection closed , ...
```

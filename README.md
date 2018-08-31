# RxHttp
HTTP (fetch) Client for TypeScript that supports real-time JSON streams and good ol' simple request/response. Powered by RxJS.

Features:
💪 Strongly typed responses
🚁 In-flight configuration changes
🌊 Long-lived JSON streams

Coming soon:
🆘 Retry facilities
📜 Documentation
💯 Test coverage

install: `npm install @mkeen/rxhttp`

ex: 

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
.send()
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

As simple as it gets:

```
import { HttpRequest } from '@mkeen/rxhttp';

new HttpRequest<any>(
  'https://localhost/simple', {
    method: 'GET'
  }
  
)
.send()
.subscribe(
  (incoming_data: any) => console.log('received response, connection closed', incoming_data);
);

// Output:
received response, connection closed , ...
```

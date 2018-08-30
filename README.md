# RxHttp
Fetch/RxJs HTTP Client for TypeScript. Designed to be as flexible and efficient an RxJS-based http client as is humanly possible. Supports long-lived real-time json streams, as well as simple request/response json interactions.

Supports typed responses via generics.

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
  }
)
.send(
  FetchBehavior.stream
)
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

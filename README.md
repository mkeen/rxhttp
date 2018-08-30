# RxHttp
Fetch/RxJs HTTP Client for TypeScript. Designed to be as flexible and efficient an RxJS-based http client as is humanly possible. Supports long-lived real-time json streams, as well as simple request/response json requests.

Interact with an HTTP stream via an RxJs Observable. Supports typed responses with generics.

install: `npm install @mkeen/rxhttp`

ex: 

```
import { HttpRequest } from '@mkeen/rxhttp';

interface Person {
  name: string;
  email: string;
}

let mike_keen = new HttpRequest<Person>(
  'https://localhost/person', {
    method: 'POST',
    body: JSON.stringify({
      'name': 'Mike',
      'email': 'mkeen.atl@gmail.com'
    })
  }
)
.watch()
.subscribe(
  (incoming_data: Person) => console.log('person changed: ', incoming_data);
);

// Reconfigure the request in-flight. Change URL, method, body, headers, whatever...
mike_keen.reconfigure('https://localhost/person_alternate', {
  method: 'POST',
  body: JSON.stringify({
    'name': 'Mike',
    'email': 'mkeen.atl@gmail.com'
  });
  
});
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
```

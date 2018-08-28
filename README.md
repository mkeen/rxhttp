# RxHttp
Simple Streaming Fetch/RxJs HTTP Client for JavaScript

Interact with an HTTP stream via an RxJs Observable. Supports typed responses with generics.

install: `npm install @mkeen/rxhttp`

ex: 

```
interface Person {
  name: string;
  email: string;
}

new HttpRequest<Person>(
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
```

Even supports basic request/response

```
new HttpRequest<any>(
  'https://localhost/boring', {
    method: 'GET'
  }
)
.send()
.subscribe(
  (incoming_data: any) => console.log('received response, connection closed', incoming_data);
)
```

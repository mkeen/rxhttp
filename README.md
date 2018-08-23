# rxhttp
Simple Streaming Fetch/RxJs HTTP Client

Interact with an HTTP stream via an RxJs Observable. Supports typed responses with generics.

install: `npm install @mkeen/rxhttp`

ex: 

```
interface Person {
  name: string;
  email: string;
}
```

```
new HttpRequest<Person>(
  'https://localhost/something', {
    method: 'POST',
    body: JSON.stringify({
      'doc_ids': []
    })
  }
).watch().subscribe(
  (incoming_data: Person) => console.log('person changed: ', incoming_data);
);
```

Even supports basic request/response

```
new HttpRequest<any>(
  'https://localhost/boring', {
    method: 'GET'
  }
).send().subscribe(
  (incoming_data: any) => console.log("received response, connection closed");
)
```
